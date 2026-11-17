import { afterAll, describe, expect, it } from "vitest"
import getPool from "../../db/connection"
import { DocumentsRepository } from "../../repositories/documents.repository"

const repository = new DocumentsRepository()

const createdCategoryIds: number[] = []
const createdQuestionIds: number[] = []

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
})
