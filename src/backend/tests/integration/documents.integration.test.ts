import { afterAll, beforeAll, describe, expect, it } from "vitest"
import getPool from "../../db/connection"
import InternalServerError from "../../errors/InternalServerError"
import { DocumentsRepository } from "../../repositories/documents.repository"
import {
    restoreScheduleConfig,
    ScheduleConfigSnapshot,
    snapshotScheduleConfig,
    useScheduleConfig,
} from "./helpers/scheduleDb"

const repository = new DocumentsRepository()

const createdCategoryIds: number[] = []
const createdQuestionIds: number[] = []
const createdAuditIds: number[] = []
const createdUserIds: number[] = []

async function createAuditEntry(actorUserId: number | null, createdAt: string): Promise<number> {
    const result = await getPool().query<{ id: string }>(
        `INSERT INTO AuditLog (area, action, actor_user_id, data, created_at)
         VALUES ('documents', 'documents_updated', $1, '{}'::jsonb, $2)
         RETURNING id`,
        [actorUserId, createdAt],
    )
    const id = Number(result.rows[0]!.id)
    createdAuditIds.push(id)
    return id
}

async function createUser(name: string): Promise<number> {
    const result = await getPool().query<{ id: string }>(
        `INSERT INTO Users (name, email, password_hash)
         VALUES ($1, $2, 'hash') RETURNING id`,
        [name, `docs-${process.pid}-${Date.now()}-${createdUserIds.length}@teste.local`],
    )
    const id = Number(result.rows[0]!.id)
    createdUserIds.push(id)
    return id
}

async function createCategory(position: number, active = true): Promise<number> {
    const result = await getPool().query<{ id: string }>(
        `INSERT INTO Categories (title, short_title, position, active)
         VALUES ('Categoria documentos teste', 'Cat docs teste', $1, $2)
         RETURNING id`,
        [position, active],
    )
    const id = Number(result.rows[0]!.id)
    createdCategoryIds.push(id)
    return id
}

async function createQuestion(
    categoryId: number,
    position: number,
    options: { active?: boolean; documents?: string[] } = {},
): Promise<number> {
    const result = await getPool().query<{ id: string }>(
        `INSERT INTO Questions (category_id, question, answer, short_title, position, active)
         VALUES ($1, 'Pergunta teste', 'Resposta teste', 'Pergunta docs teste', $2, $3)
         RETURNING id`,
        [categoryId, position, options.active ?? true],
    )
    const id = Number(result.rows[0]!.id)
    createdQuestionIds.push(id)
    const documents = options.documents ?? []
    for (let index = 0; index < documents.length; index++) {
        await getPool().query(
            "INSERT INTO RequiredDocuments (question_id, description, position) VALUES ($1, $2, $3)",
            [id, documents[index], index],
        )
    }
    return id
}

afterAll(async () => {
    const pool = getPool()
    await pool.query("DELETE FROM AuditLog WHERE id = ANY($1::bigint[])", [createdAuditIds])
    await pool.query("DELETE FROM Users WHERE id = ANY($1::bigint[])", [createdUserIds])
    await pool.query("DELETE FROM RequiredDocuments WHERE question_id = ANY($1::bigint[])", [
        createdQuestionIds,
    ])
    await pool.query("DELETE FROM Questions WHERE id = ANY($1::bigint[])", [createdQuestionIds])
    await pool.query("DELETE FROM Categories WHERE id = ANY($1::bigint[])", [createdCategoryIds])
    await pool.end()
})

describe("DocumentsRepository (Postgres)", () => {
    describe("getSampleQuestions", () => {
        it("lista todas as perguntas ativas, sem limite, na ordem da tela Conteúdo", async () => {
            const lateCategory = await createCategory(9002)
            const earlyCategory = await createCategory(9001)
            const lateIds: number[] = []
            for (let position = 11; position >= 0; position--) {
                lateIds.unshift(await createQuestion(lateCategory, position))
            }
            const earlyId = await createQuestion(earlyCategory, 99)

            const rows = await repository.getSampleQuestions()
            const mine = new Set([earlyId, ...lateIds].map(String))
            const ids = rows.filter((row) => mine.has(row.id)).map((row) => Number(row.id))

            expect(ids).toEqual([earlyId, ...lateIds])
        })

        it("não lista pergunta inativa nem pergunta de categoria inativa", async () => {
            const activeCategory = await createCategory(9003)
            const inactiveCategory = await createCategory(9004, false)
            const visibleId = await createQuestion(activeCategory, 0)
            const inactiveQuestionId = await createQuestion(activeCategory, 1, { active: false })
            const inactiveCategoryQuestionId = await createQuestion(inactiveCategory, 0)

            const ids = (await repository.getSampleQuestions()).map((row) => Number(row.id))

            expect(ids).toContain(visibleId)
            expect(ids).not.toContain(inactiveQuestionId)
            expect(ids).not.toContain(inactiveCategoryQuestionId)
        })

        it("devolve o título da categoria e os documentos de cada pergunta", async () => {
            const categoryId = await createCategory(9005)
            const questionId = await createQuestion(categoryId, 0, {
                documents: ["Nota fiscal", "Contrato"],
            })

            const row = (await repository.getSampleQuestions()).find(
                (item) => Number(item.id) === questionId,
            )

            expect(row?.categoryTitle).toBe("Categoria documentos teste")
            expect(row?.documents).toEqual(["Nota fiscal", "Contrato"])
        })
    })

    describe("getQuestionDocuments", () => {
        it("devolve os documentos da pergunta ativa na ordem cadastrada", async () => {
            const categoryId = await createCategory(9006)
            const questionId = await createQuestion(categoryId, 0, { documents: ["B", "A"] })

            expect(await repository.getQuestionDocuments(questionId)).toEqual(["B", "A"])
        })

        it("devolve nulo para pergunta inexistente, inativa ou de categoria inativa", async () => {
            const activeCategory = await createCategory(9007)
            const inactiveCategory = await createCategory(9008, false)
            const inactiveQuestionId = await createQuestion(activeCategory, 0, {
                active: false,
                documents: ["X"],
            })
            const inactiveCategoryQuestionId = await createQuestion(inactiveCategory, 0, {
                documents: ["Y"],
            })

            expect(await repository.getQuestionDocuments(inactiveQuestionId)).toBeNull()
            expect(await repository.getQuestionDocuments(inactiveCategoryQuestionId)).toBeNull()
            expect(await repository.getQuestionDocuments(2147483647)).toBeNull()
        })

        it("devolve lista vazia para pergunta ativa sem documentos", async () => {
            const categoryId = await createCategory(9009)
            const questionId = await createQuestion(categoryId, 0)

            expect(await repository.getQuestionDocuments(questionId)).toEqual([])
        })
    })

    describe("getLastChange", () => {
        it("devolve quem alterou por último e quando", async () => {
            const userId = await createUser("Ana Documentos")
            await createAuditEntry(userId, "2999-01-01T10:00:00Z")

            expect(await repository.getLastChange()).toEqual({
                id: userId,
                name: "Ana Documentos",
                at: "2999-01-01T10:00:00.000Z",
            })
        })

        it("mostra usuário removido quando a alteração não tem mais autor", async () => {
            await createAuditEntry(null, "2999-01-02T10:00:00Z")

            expect(await repository.getLastChange()).toEqual({
                id: null,
                name: "usuário removido",
                at: "2999-01-02T10:00:00.000Z",
            })
        })
    })

    describe("getScheduleContext", () => {
        let snapshot: ScheduleConfigSnapshot

        beforeAll(async () => {
            snapshot = await snapshotScheduleConfig()
        })

        afterAll(async () => {
            await restoreScheduleConfig(snapshot)
        })

        it("devolve endereço e lembrete configurados em Horários de atendimento", async () => {
            await useScheduleConfig({
                settings: {
                    slot_minutes: 30,
                    seats_per_slot: 2,
                    window_days: 30,
                    min_notice_days: 1,
                    wait_alert_days: 7,
                    unit_address: "Rua Teste, 10",
                    unit_address_complement: "Sala 2",
                    reminder_enabled: true,
                    reminder_hours: 12,
                },
                ranges: [],
            })

            expect(await repository.getScheduleContext()).toEqual({
                unitAddress: "Rua Teste, 10",
                unitAddressComplement: "Sala 2",
                reminderEnabled: true,
                reminderHours: 12,
            })
        })

        it("falha em vez de inventar um endereço quando não há configuração", async () => {
            await getPool().query("DELETE FROM ScheduleChanges")
            await getPool().query("DELETE FROM ScheduleSettings")

            await expect(repository.getScheduleContext()).rejects.toBeInstanceOf(
                InternalServerError,
            )
        })
    })
})
