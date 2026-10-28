import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import app from "../../app"
import getPool from "../../db/connection"
import { seedContent } from "../../db/seeds/content.seed"
import { createTestUser, deleteTestUsers, TestUser } from "./helpers/usersDb"

const ORIGIN = process.env.FRONTEND_ORIGIN as string

describe("Content API integration tests (Postgres)", () => {
    const createdUserIds: (number | null)[] = []
    const createdCategoryIds: number[] = []
    const createdQuestionIds: number[] = []
    let editor: TestUser
    let viewerOnly: TestUser

    async function user(input: Parameters<typeof createTestUser>[0]): Promise<TestUser> {
        const created = await createTestUser(input)
        createdUserIds.push(created.createdId)
        return created
    }

    beforeAll(async () => {
        editor = await user({
            name: "Editora Conteúdo Integração",
            permissions: ["content.manage"],
        })
        viewerOnly = await user({
            name: "Visualizador Agendamentos",
            permissions: ["appointments.view"],
        })
    })

    afterAll(async () => {
        const pool = getPool()
        if (createdQuestionIds.length > 0) {
            await pool.query(
                "DELETE FROM RequiredDocuments WHERE question_id = ANY($1::bigint[])",
                [createdQuestionIds],
            )
            await pool.query("DELETE FROM Questions WHERE id = ANY($1::bigint[])", [
                createdQuestionIds,
            ])
        }
        if (createdCategoryIds.length > 0) {
            await pool.query(
                `DELETE FROM RequiredDocuments
                 WHERE question_id IN (SELECT id FROM Questions WHERE category_id = ANY($1::bigint[]))`,
                [createdCategoryIds],
            )
            await pool.query("DELETE FROM Questions WHERE category_id = ANY($1::bigint[])", [
                createdCategoryIds,
            ])
            await pool.query("DELETE FROM Categories WHERE id = ANY($1::bigint[])", [
                createdCategoryIds,
            ])
        }

        const userIds = createdUserIds.filter((id): id is number => id !== null)
        if (userIds.length > 0) {
            await pool.query(
                "UPDATE Questions SET updated_by = NULL WHERE updated_by = ANY($1::bigint[])",
                [userIds],
            )
            await pool.query(
                "UPDATE Categories SET updated_by = NULL WHERE updated_by = ANY($1::bigint[])",
                [userIds],
            )
        }

        const client = await pool.connect()
        try {
            await client.query("BEGIN")
            await seedContent(client)
            await client.query("COMMIT")
        } catch {
            await client.query("ROLLBACK")
        } finally {
            client.release()
        }

        await deleteTestUsers(createdUserIds)
    })

    it("rejects unauthenticated requests and users without content.manage permission", async () => {
        const unauthRes = await request(app)
            .get("/api/v1/content/categories")
            .set("Origin", ORIGIN)
        expect(unauthRes.status).toBe(401)

        const forbiddenRes = await request(app)
            .get("/api/v1/content/categories")
            .set("Origin", ORIGIN)
            .set("Cookie", viewerOnly.cookie)
        expect(forbiddenRes.status).toBe(403)
    })

    it("creates, edits, toggles active, and reorders categories while enforcing accent-insensitive uniqueness", async () => {
        const suffix = Date.now()
        const createRes1 = await request(app)
            .post("/api/v1/content/categories")
            .set("Origin", ORIGIN)
            .set("Cookie", editor.cookie)
            .send({
                title: `Educação Teste ${suffix}`,
                shortTitle: "Educação e cursos",
                description: "Dúvidas sobre mensalidades escolares",
            })

        expect(createRes1.status).toBe(201)
        const cat1Id = createRes1.body.data.id as number
        createdCategoryIds.push(cat1Id)
        expect(createRes1.body.data.active).toBe(true)
        expect(createRes1.body.data.hiddenInChatbot).toBe(true)
        expect(createRes1.body.data.updatedBy).toEqual({
            id: editor.id,
            name: editor.name,
        })

        const duplicateRes = await request(app)
            .post("/api/v1/content/categories")
            .set("Origin", ORIGIN)
            .set("Cookie", editor.cookie)
            .send({
                title: `EDUCACAO TESTE ${suffix}`,
                shortTitle: "Outro título curto",
            })
        expect(duplicateRes.status).toBe(409)
        expect(duplicateRes.body.error.code).toBe("CATEGORY_TITLE_CONFLICT")

        const createRes2 = await request(app)
            .post("/api/v1/content/categories")
            .set("Origin", ORIGIN)
            .set("Cookie", editor.cookie)
            .send({
                title: `Habitação Teste ${suffix}`,
                shortTitle: "Imóveis e aluguel",
            })
        expect(createRes2.status).toBe(201)
        const cat2Id = createRes2.body.data.id as number
        createdCategoryIds.push(cat2Id)

        const updateRes = await request(app)
            .put(`/api/v1/content/categories/${cat1Id}`)
            .set("Origin", ORIGIN)
            .set("Cookie", editor.cookie)
            .send({
                title: `Educação Superior ${suffix}`,
                shortTitle: "Faculdades e cursos",
                description: "Matrículas e contratos educacionais",
            })
        expect(updateRes.status).toBe(200)
        expect(updateRes.body.data.title).toBe(`Educação Superior ${suffix}`)

        const toggleRes = await request(app)
            .patch(`/api/v1/content/categories/${cat2Id}/active`)
            .set("Origin", ORIGIN)
            .set("Cookie", editor.cookie)
            .send({ active: false })
        expect(toggleRes.status).toBe(200)
        expect(toggleRes.body.data.active).toBe(false)

        const allBeforeRes = await request(app)
            .get("/api/v1/content/categories")
            .set("Origin", ORIGIN)
            .set("Cookie", editor.cookie)
        expect(allBeforeRes.status).toBe(200)
        const allIds: number[] = allBeforeRes.body.data.map((c: { id: number }) => c.id)

        const swappedIds = [
            cat2Id,
            cat1Id,
            ...allIds.filter((id) => id !== cat1Id && id !== cat2Id),
        ]
        const reorderRes = await request(app)
            .put("/api/v1/content/categories/reorder")
            .set("Origin", ORIGIN)
            .set("Cookie", editor.cookie)
            .send({ categoryIds: swappedIds })
        expect(reorderRes.status).toBe(200)
        expect(reorderRes.body.data[0].id).toBe(cat2Id)
        expect(reorderRes.body.data[1].id).toBe(cat1Id)
    })

    it("creates, updates, reorders, searches accent-insensitively, and previews questions in Postgres", async () => {
        const catId = createdCategoryIds[0]!

        const createQ1Res = await request(app)
            .post("/api/v1/content/questions")
            .set("Origin", ORIGIN)
            .set("Cookie", editor.cookie)
            .send({
                categoryId: catId,
                shortTitle: "Retenção de histórico",
                shortDescription: "Faculdade recusa documentos",
                question: "A faculdade pode reter meu histórico escolar por inadimplência?",
                answer: "Não. A instituição de ensino não pode reter documentos escolares por falta de pagamento.",
                legalBasis: "Lei nº 9.870/1999, art. 6º",
                requiredDocuments: ["Contrato de prestação de serviços", "RG ou CNH"],
                requiresInPerson: false,
                outOfScope: false,
                llmAllowed: true,
            })

        expect(createQ1Res.status).toBe(201)
        const q1Id = createQ1Res.body.data.id as number
        createdQuestionIds.push(q1Id)
        expect(createQ1Res.body.data.requiredDocuments).toEqual([
            "Contrato de prestação de serviços",
            "RG ou CNH",
        ])

        const createQ2Res = await request(app)
            .post("/api/v1/content/questions")
            .set("Origin", ORIGIN)
            .set("Cookie", editor.cookie)
            .send({
                categoryId: catId,
                shortTitle: "Renegociação de dívida",
                shortDescription: "Acordo presencial",
                question: "Como renegociar mensalidades atrasadas?",
                answer: "Compareça ao PROCON com os boletos em aberto para tentativa de conciliação.",
                legalBasis: "Código de Defesa do Consumidor",
                requiredDocuments: ["Boletos vencidos"],
                requiresInPerson: true,
                inPersonNote: "Traga todos os boletos impressos.",
                outOfScope: false,
                llmAllowed: false,
            })

        expect(createQ2Res.status).toBe(201)
        const q2Id = createQ2Res.body.data.id as number
        createdQuestionIds.push(q2Id)

        const searchRes = await request(app)
            .get("/api/v1/content/questions")
            .set("Origin", ORIGIN)
            .set("Cookie", editor.cookie)
            .query({ search: "retencao de historico" })

        expect(searchRes.status).toBe(200)
        expect(searchRes.body.data.some((q: { id: number }) => q.id === q1Id)).toBe(true)

        const reorderQRes = await request(app)
            .put(`/api/v1/content/categories/${catId}/questions/reorder`)
            .set("Origin", ORIGIN)
            .set("Cookie", editor.cookie)
            .send({ questionIds: [q2Id, q1Id] })

        expect(reorderQRes.status).toBe(200)
        expect(reorderQRes.body.data.map((q: { id: number }) => q.id)).toEqual([q2Id, q1Id])

        const previewRes = await request(app)
            .post("/api/v1/content/preview")
            .set("Origin", ORIGIN)
            .set("Cookie", editor.cookie)
            .send({
                questionId: q2Id,
                categoryId: catId,
                shortTitle: "Renegociação de dívida",
                shortDescription: "Acordo presencial",
                question: "Como renegociar mensalidades atrasadas?",
                answer: "Compareça ao PROCON com os boletos em aberto.",
                legalBasis: "CDC",
                requiredDocuments: ["Boletos vencidos"],
                requiresInPerson: true,
                inPersonNote: "Traga todos os boletos impressos.",
                outOfScope: false,
                llmAllowed: false,
            })

        expect(previewRes.status).toBe(200)
        expect(previewRes.body.data.nextStepBubble.type).toBe("schedule_offer")
        expect(previewRes.body.data.nextStepBubble.inPersonNote).toBe(
            "Traga todos os boletos impressos.",
        )
    })

    it("preserves panel-edited seeded questions when seedContent runs again (updated_by IS NOT NULL)", async () => {
        const pool = getPool()
        const client = await pool.connect()
        try {
            await client.query("BEGIN")
            await seedContent(client)
            await client.query("COMMIT")
        } finally {
            client.release()
        }

        const seededRowRes = await pool.query<{
            id: number
            category_id: number
            short_title: string
            question: string
            answer: string
            legal_basis: string | null
        }>(
            `SELECT id::int AS id, category_id::int AS category_id, short_title, question, answer, legal_basis
             FROM Questions
             WHERE seed_key IS NOT NULL
             ORDER BY id ASC
             LIMIT 1`,
        )
        const seededRow = seededRowRes.rows[0]!

        const customAnswer =
            "Resposta editada pelo painel na #63 que não deve ser sobrescrita pelo seed."
        const editRes = await request(app)
            .put(`/api/v1/content/questions/${seededRow.id}`)
            .set("Origin", ORIGIN)
            .set("Cookie", editor.cookie)
            .send({
                categoryId: seededRow.category_id,
                shortTitle: seededRow.short_title,
                question: seededRow.question,
                answer: customAnswer,
                legalBasis: seededRow.legal_basis,
                requiredDocuments: ["Documento editado pelo painel"],
                requiresInPerson: false,
                outOfScope: false,
                llmAllowed: true,
            })
        expect(editRes.status).toBe(200)
        expect(editRes.body.data.updatedBy.id).toBe(editor.id)

        const seedClient = await pool.connect()
        try {
            await seedClient.query("BEGIN")
            const seedResult = await seedContent(seedClient)
            await seedClient.query("COMMIT")
            expect(seedResult.questions.kept).toBeGreaterThanOrEqual(1)
        } finally {
            seedClient.release()
        }

        const afterSeedRes = await pool.query<{ answer: string }>(
            "SELECT answer FROM Questions WHERE id = $1",
            [seededRow.id],
        )
        expect(afterSeedRes.rows[0]?.answer).toBe(customAnswer)
    })
})
