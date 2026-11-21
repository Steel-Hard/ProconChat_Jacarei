import { describe, expect, it, vi } from "vitest"
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

    it("manages questions, rejects moving question to another category, computes answerLengthWarning, searches across categories, and generates WhatsApp preview", async () => {
        const repository = new ContentStubRepository()
        const service = new ContentService({ repository })

        const cat = await service.createCategory(
            { title: "Compras e Garantias", shortTitle: "Compras e garantia", description: null },
            1,
        )
        const cat2 = await service.createCategory(
            { title: "Serviços Financeiros", shortTitle: "Bancos e cartões", description: null },
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

        await expect(
            service.updateQuestion(
                q1.id,
                {
                    categoryId: cat2.id,
                    shortTitle: q1.shortTitle,
                    shortDescription: q1.shortDescription,
                    question: q1.question,
                    answer: q1.answer,
                    legalBasis: q1.legalBasis,
                    requiredDocuments: q1.requiredDocuments,
                    requiresInPerson: false,
                    inPersonNote: null,
                    outOfScope: false,
                    llmAllowed: true,
                },
                1,
            ),
        ).rejects.toThrow(/Não é permitido mover uma pergunta para outra categoria/)

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
        expect(preview.botMessages.categoryList.message.rows[0]?.title).toBe("Produto com vício")
        expect(preview.botMessages.officialMessages[1]).toMatchObject({ type: "buttons", text: "A dúvida foi resolvida?" })
    })
    it("does not write anything when previewing a question", async () => {
        const repository = new ContentStubRepository()
        const service = new ContentService({ repository })
        const cat = await service.createCategory(
            { title: "Compras e Garantias", shortTitle: "Compras e garantia", description: null },
            1,
        )
        const q1 = await service.createQuestion(
            {
                categoryId: cat.id,
                shortTitle: "Produto com defeito",
                shortDescription: null,
                question: "Comprei um produto com defeito, o que fazer?",
                answer: "O fornecedor tem até 30 dias para reparar.",
                legalBasis: null,
                requiredDocuments: [],
                requiresInPerson: false,
                inPersonNote: null,
                outOfScope: false,
                llmAllowed: true,
                active: true,
            },
            1,
        )
        const categoriesBefore = await repository.listCategories()
        const questionsBefore = await repository.listQuestionsByCategory(cat.id)
        const writers = [
            "createCategory",
            "updateCategory",
            "setCategoryActive",
            "reorderCategories",
            "createQuestion",
            "updateQuestion",
            "setQuestionActive",
            "reorderQuestions",
        ] as const
        const spies = writers.map((name) => vi.spyOn(repository, name))

        await service.previewQuestion({
            questionId: q1.id,
            categoryId: cat.id,
            shortTitle: "Outro título",
            shortDescription: "Outra descrição",
            question: "Outra pergunta?",
            answer: "Outra resposta.",
            legalBasis: "CDC",
            requiredDocuments: ["Nota fiscal"],
            requiresInPerson: true,
            inPersonNote: "Traga os documentos.",
            outOfScope: false,
            llmAllowed: true,
        })

        for (const spy of spies) {
            expect(spy).not.toHaveBeenCalled()
        }
        expect(await repository.listCategories()).toEqual(categoriesBefore)
        expect(await repository.listQuestionsByCategory(cat.id)).toEqual(questionsBefore)
    })

    it("resolves {endereco} and {horarios} from the current schedule in previewQuestion without querying schedule when absent", async () => {
        const repository = new ContentStubRepository()
        const getConfig = vi.fn().mockResolvedValue({
            slotMinutes: 30,
            seatsPerSlot: 2,
            windowDays: 30,
            minNoticeDays: 1,
            waitAlertDays: 7,
            unitAddress: "Av. Nove de Julho, 215 - Centro, Jacareí - SP",
            unitAddressComplement: "Sala 2",
            reminderEnabled: true,
            reminderHours: 24,
            ranges: [1, 2, 3, 4, 5].map((weekday) => ({
                weekday,
                slotIndex: 1,
                startTime: "08:00",
                endTime: "17:00",
            })),
            blockedDates: [],
            updatedBy: null,
            updatedAt: null,
        })
        const service = new ContentService({ repository, scheduleRepo: { getConfig } })
        const cat = await service.createCategory(
            { title: "Atendimento", shortTitle: "Atendimento", description: null },
            1,
        )

        await service.previewQuestion({
            categoryId: cat.id,
            shortTitle: "Prazo",
            shortDescription: null,
            question: "Qual o prazo?",
            answer: "O prazo é de 10 dias.",
            legalBasis: null,
            requiredDocuments: [],
            requiresInPerson: false,
            inPersonNote: null,
            outOfScope: false,
            llmAllowed: false,
        })
        expect(getConfig).not.toHaveBeenCalled()

        const preview = await service.previewQuestion({
            categoryId: cat.id,
            shortTitle: "Horário e endereço",
            shortDescription: null,
            question: "Qual é o horário e o endereço do PROCON?",
            answer: "O PROCON atende de {horarios}, em {endereco}.",
            legalBasis: null,
            requiredDocuments: [],
            requiresInPerson: false,
            inPersonNote: null,
            outOfScope: false,
            llmAllowed: true,
        })

        expect(getConfig).toHaveBeenCalledTimes(1)
        const expectedText =
            "O PROCON atende de segunda a sexta, das 08:00 às 17:00, em Av. Nove de Julho, 215 - Centro, Jacareí - SP (Sala 2)."
        expect(preview.botMessages.officialMessages[0]?.text).toContain(expectedText)
    })
})
