import { describe, expect, it } from "vitest"
import searchContentQuestions from "@/utils/content/searchContentQuestions"
import type ContentDraftQuestion from "@/types/content/ContentDraftQuestion.types"
import type ContentDraftState from "@/types/content/ContentDraftState.types"

function question(key: string, categoryKey: string, overrides: Partial<ContentDraftQuestion> = {}) {
    return {
        key,
        id: Number(key) || null,
        categoryKey,
        shortTitle: `Título ${key}`,
        shortDescription: "",
        question: `Pergunta ${key}`,
        answer: `Resposta ${key}`,
        legalBasis: "",
        requiredDocuments: [],
        requiresInPerson: false,
        inPersonNote: "",
        outOfScope: false,
        llmAllowed: true,
        active: true,
        updatedBy: null,
        updatedAt: null,
        ...overrides
    } satisfies ContentDraftQuestion
}

const category = (key: string, shortTitle: string) => ({
    key,
    id: Number(key) || null,
    title: shortTitle,
    shortTitle,
    description: "",
    active: true,
    updatedBy: null,
    updatedAt: null
})

const draft: ContentDraftState = {
    categories: [category("1", "Contratos"), category("2", "Compras")],
    questionsByCategory: {
        "1": [question("10", "1", { answer: "Direito à devolução em 7 dias" })],
        "2": [
            question("20", "2", { shortTitle: "Troca de produto" }),
            question("nova-1", "2", { question: "Posso DEVOLVER o item?" })
        ]
    },
    nextNewKey: 2
}

describe("searchContentQuestions", () => {
    it("devolucao acha Devolução na resposta", () => {
        const results = searchContentQuestions(draft, "devolucao")

        expect(results.map((result) => result.question.key)).toEqual(["10"])
    })

    it("acha pelo título curto", () => {
        expect(searchContentQuestions(draft, "troca")[0].question.key).toBe("20")
    })

    it("acha pelo texto da pergunta e inclui pergunta nova ainda não salva", () => {
        expect(searchContentQuestions(draft, "devolver")[0].question.key).toBe("nova-1")
    })

    it("não busca com termo vazio ou só com espaços", () => {
        expect(searchContentQuestions(draft, "")).toEqual([])
        expect(searchContentQuestions(draft, "   ")).toEqual([])
    })

    it("devolve vazio quando nada combina", () => {
        expect(searchContentQuestions(draft, "zzz")).toEqual([])
    })

    it("traz a categoria de cada resultado na ordem das categorias", () => {
        const results = searchContentQuestions(draft, "e")

        expect(results.map((result) => result.category.key)).toEqual(["1", "2", "2"])
    })
})
