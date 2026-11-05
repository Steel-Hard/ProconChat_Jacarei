import { describe, expect, it } from "vitest"
import { ContentStubRepository } from "./contentStub.repository"

describe("ContentStubRepository", () => {
    it("creates, updates, toggles active, checks normalized title uniqueness, and reorders categories", async () => {
        const repo = new ContentStubRepository()

        const cat1 = await repo.createCategory(
            {
                title: "Compras e Garantias",
                shortTitle: "Compras e garantia",
                description: "Produtos com defeito",
            },
            1,
        )
        const cat2 = await repo.createCategory(
            {
                title: "Serviços Financeiros",
                shortTitle: "Bancos e cartões",
                description: null,
            },
            1,
        )

        expect(cat1.id).toBe(1)
        expect(cat1.position).toBe(0)
        expect(cat2.id).toBe(2)
        expect(cat2.position).toBe(1)

        expect(await repo.existsCategoryWithNormalizedTitle("COMPRAS E GARANTIAS")).toBe(true)
        expect(await repo.existsCategoryWithNormalizedTitle("COMPRAS E GARANTIAS", cat1.id)).toBe(
            false,
        )
        expect(await repo.existsCategoryWithNormalizedTitle("Servicos Financeiros")).toBe(true)

        const updated = await repo.updateCategory(
            cat1.id,
            {
                title: "Compras, Trocas e Garantias",
                shortTitle: "Trocas e garantia",
                description: "Atualizada",
                active: false,
            },
            2,
        )
        expect(updated?.title).toBe("Compras, Trocas e Garantias")
        expect(updated?.active).toBe(false)
        expect(updated?.updatedBy).toEqual({ id: 2, name: "Usuário 2" })

        const reactivated = await repo.setCategoryActive(cat1.id, true, 3)
        expect(reactivated?.active).toBe(true)

        const reordered = await repo.reorderCategories([cat2.id, cat1.id], 4)
        expect(reordered.map((c) => c.id)).toEqual([cat2.id, cat1.id])
        expect(reordered.map((c) => c.position)).toEqual([0, 1])

        expect(await repo.updateCategory(999, { title: "X", shortTitle: "X", description: null }, 1)).toBeNull()
        expect(await repo.setCategoryActive(999, false, 1)).toBeNull()
    })

    it("creates, updates, toggles active, searches accent-insensitively, and reorders questions", async () => {
        const repo = new ContentStubRepository()
        const cat = await repo.createCategory(
            { title: "Telecomunicações", shortTitle: "Internet e telefone", description: null },
            1,
        )

        const q1 = await repo.createQuestion(
            {
                categoryId: cat.id,
                shortTitle: "Cobrança indevida",
                shortDescription: "Fatura com valor maior",
                question: "Estão me cobrando um serviço não contratado.",
                answer: "Solicite o cancelamento e a devolução em dobro.",
                legalBasis: "Art. 42 do CDC",
                requiredDocuments: ["Fatura", "RG ou CNH"],
                requiresInPerson: false,
                inPersonNote: null,
                outOfScope: false,
                llmAllowed: true,
                active: true,
            },
            1,
        )

        const q2 = await repo.createQuestion(
            {
                categoryId: cat.id,
                shortTitle: "Multa de fidelidade",
                shortDescription: null,
                question: "A operadora pode cobrar multa de fidelidade?",
                answer: "Se houve falha na prestação do serviço, a multa é indevida.",
                legalBasis: "Resolução Anatel",
                requiredDocuments: [],
                requiresInPerson: true,
                inPersonNote: "Traga o contrato",
                outOfScope: false,
                llmAllowed: true,
                active: true,
            },
            1,
        )

        const categoryAfter = await repo.findCategoryById(cat.id)
        expect(categoryAfter?.questionsCount).toBe(2)
        expect(categoryAfter?.activeQuestionsCount).toBe(2)

        const foundByAccentInsensitive = await repo.searchQuestions("cobranca")
        expect(foundByAccentInsensitive).toHaveLength(1)
        expect(foundByAccentInsensitive[0]?.id).toBe(q1.id)

        const deactivated = await repo.setQuestionActive(q1.id, false, 2)
        expect(deactivated?.active).toBe(false)

        const categoryAfterDeactivate = await repo.findCategoryById(cat.id)
        expect(categoryAfterDeactivate?.questionsCount).toBe(2)
        expect(categoryAfterDeactivate?.activeQuestionsCount).toBe(1)

        const updatedQ2 = await repo.updateQuestion(
            q2.id,
            {
                categoryId: cat.id,
                shortTitle: "Fidelidade abusiva",
                shortDescription: "Cancelamento sem multa",
                question: q2.question,
                answer: q2.answer,
                legalBasis: q2.legalBasis,
                requiredDocuments: ["Contrato"],
                requiresInPerson: true,
                inPersonNote: "Traga o contrato",
                outOfScope: false,
                llmAllowed: true,
                active: true,
            },
            3,
        )
        expect(updatedQ2?.shortTitle).toBe("Fidelidade abusiva")
        expect(updatedQ2?.requiredDocuments).toEqual(["Contrato"])

        const reordered = await repo.reorderQuestions(cat.id, [q2.id, q1.id], 3)
        expect(reordered.map((q) => q.id)).toEqual([q2.id, q1.id])

        expect(await repo.setQuestionActive(999, false, 1)).toBeNull()
    })
})
