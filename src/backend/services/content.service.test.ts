import { describe, expect, it } from "vitest"
import BadRequestError from "../errors/BadRequestError"
import ConflictError from "../errors/ConflictError"
import NotFoundError from "../errors/NotFoundError"
import { ContentStubRepository } from "../repositories/mock/contentStub.repository"
import { ContentService } from "./content.service"

describe("ContentService", () => {
    it("creates categories at the end, detects accent/case-insensitive duplicates, and computes hiddenInChatbot", async () => {
        const repository = new ContentStubRepository()
        const service = new ContentService({ repository })

        const created = await service.createCategory(
            {
                title: "Educação e Cursos",
                shortTitle: "Escolas e cursos",
                description: "Mensalidades e matrículas",
            },
            10,
        )

        expect(created.active).toBe(true)
        expect(created.hiddenInChatbot).toBe(true)
        expect(created.whatsappPage).toBeNull()

        await expect(
            service.createCategory(
                {
                    title: "educacao e cursos",
                    shortTitle: "Outro curto",
                    description: null,
                },
                10,
            ),
        ).rejects.toThrow(ConflictError)
    })

    it("updates category, toggles active, and reorders validating the complete ID list", async () => {
        const repository = new ContentStubRepository()
        const service = new ContentService({ repository })

        const c1 = await service.createCategory(
            { title: "Compras", shortTitle: "Compras", description: null },
            1,
        )
        const c2 = await service.createCategory(
            { title: "Saúde", shortTitle: "Planos de saúde", description: null },
            1,
        )

        await expect(
            service.updateCategory(
                c2.id,
                { title: "COMPRAS", shortTitle: "Planos", description: null },
                1,
            ),
        ).rejects.toThrow(ConflictError)

        await expect(
            service.updateCategory(
                999,
                { title: "Inexistente", shortTitle: "Inexistente", description: null },
                1,
            ),
        ).rejects.toThrow(NotFoundError)

        const updated = await service.updateCategory(
            c2.id,
            { title: "Saúde Suplementar", shortTitle: "Planos de saúde", description: "ANS" },
            2,
        )
        expect(updated.title).toBe("Saúde Suplementar")

        const deactivated = await service.setCategoryActive(c1.id, false, 2)
        expect(deactivated.active).toBe(false)

        await expect(service.reorderCategories([c1.id], 2)).rejects.toThrow(BadRequestError)

        const reordered = await service.reorderCategories([c2.id, c1.id], 2)
        expect(reordered.map((c) => c.id)).toEqual([c2.id, c1.id])
    })

    it("manages questions, computes answerLengthWarning, searches across categories, and generates WhatsApp preview", async () => {
        const repository = new ContentStubRepository()
        const service = new ContentService({ repository })

        const cat = await service.createCategory(
            { title: "Compras e Garantias", shortTitle: "Compras e garantia", description: null },
            1,
        )

        await expect(
            service.createQuestion(
                {
                    categoryId: 999,
                    shortTitle: "Invalida",
                    shortDescription: null,
                    question: "Pergunta?",
                    answer: "Resposta.",
                    legalBasis: null,
                    requiredDocuments: [],
                    requiresInPerson: false,
                    inPersonNote: null,
                    outOfScope: false,
                    llmAllowed: true,
                    active: true,
                },
                1,
            ),
        ).rejects.toThrow(NotFoundError)

        const q1 = await service.createQuestion(
            {
                categoryId: cat.id,
                shortTitle: "Produto com defeito",
                shortDescription: "Reparo em 30 dias",
                question: "Comprei um produto com defeito, o que fazer?",
                answer: "A".repeat(1050),
                legalBasis: "Art. 18 do CDC",
                requiredDocuments: ["Nota fiscal"],
                requiresInPerson: false,
                inPersonNote: null,
                outOfScope: false,
                llmAllowed: true,
                active: true,
            },
            1,
        )

        expect(q1.answerLengthWarning).toBe(true)
        expect(q1.whatsappPage).toBe(1)

        const categoriesAfterQuestion = await service.listCategories()
        expect(categoriesAfterQuestion[0]?.hiddenInChatbot).toBe(false)
        expect(categoriesAfterQuestion[0]?.whatsappPage).toBe(1)

        const searchResults = await service.listQuestions({ search: "DEFEITO" })
        expect(searchResults).toHaveLength(1)
        expect(searchResults[0]?.categoryTitle).toBe("Compras e Garantias")
        expect(searchResults[0]?.whatsappPage).toBeNull()

        const preview = await service.previewQuestion({
            questionId: q1.id,
            categoryId: cat.id,
            shortTitle: "Produto com vício",
            shortDescription: "Reparo em 30 dias",
            question: q1.question,
            answer: q1.answer,
            legalBasis: q1.legalBasis,
            requiredDocuments: q1.requiredDocuments,
            requiresInPerson: false,
            inPersonNote: null,
            outOfScope: false,
            llmAllowed: true,
        })

        expect(preview.answerLengthWarning).toBe(true)
        expect(preview.categoryList.rows[0]?.shortTitle).toBe("Produto com vício")
        expect(preview.nextStepBubble?.type).toBe("resolution")
    })
})
