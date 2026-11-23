import { describe, expect, it } from "vitest"
import validateQuestionDraft from "@/utils/content/validateQuestionDraft"
import type ContentDraftQuestion from "@/types/content/ContentDraftQuestion.types"

const base: ContentDraftQuestion = {
    key: "nova-1",
    id: null,
    categoryKey: "1",
    shortTitle: "Troca",
    shortDescription: "",
    question: "Posso trocar?",
    answer: "Pode.",
    legalBasis: "",
    requiredDocuments: [],
    requiresInPerson: false,
    inPersonNote: "",
    outOfScope: false,
    llmAllowed: true,
    active: true,
    updatedBy: null,
    updatedAt: null
}

function errorKeys(fields: Partial<ContentDraftQuestion>) {
    return validateQuestionDraft({ ...base, ...fields }).errors.map((error) => error.key)
}

describe("validateQuestionDraft", () => {
    it("aceita a pergunta mínima", () => {
        expect(validateQuestionDraft(base)).toEqual({ valid: true, errors: [], warnings: [] })
    })

    it("valida o título curto: obrigatório, 24 aceita, 25 recusa, sem quebra de linha", () => {
        expect(errorKeys({ shortTitle: " " })).toEqual(["errors.shortTitleRequired"])
        expect(errorKeys({ shortTitle: "a".repeat(24) })).toEqual([])
        expect(errorKeys({ shortTitle: "a".repeat(25) })).toEqual(["errors.shortTitleMax"])
        expect(errorKeys({ shortTitle: "a\nb" })).toEqual(["errors.noLineBreaks"])
        expect(errorKeys({ shortTitle: "a\tb" })).toEqual(["errors.noLineBreaks"])
    })

    it("valida a descrição curta: 72 aceita, 73 recusa, sem quebra de linha", () => {
        expect(errorKeys({ shortDescription: "a".repeat(72) })).toEqual([])
        expect(errorKeys({ shortDescription: "a".repeat(73) })).toEqual([
            "errors.shortDescriptionMax"
        ])
        expect(errorKeys({ shortDescription: "a\nb" })).toEqual(["errors.noLineBreaks"])
    })

    it("valida o texto da pergunta: obrigatório, 500 aceita, 501 recusa", () => {
        expect(errorKeys({ question: "" })).toEqual(["errors.questionRequired"])
        expect(errorKeys({ question: "a".repeat(500) })).toEqual([])
        expect(errorKeys({ question: "a".repeat(501) })).toEqual(["errors.questionMax"])
    })

    it("valida a resposta: obrigatória, 3000 aceita, 3001 recusa", () => {
        expect(errorKeys({ answer: "  " })).toEqual(["errors.answerRequired"])
        expect(errorKeys({ answer: "a".repeat(3000) })).toEqual([])
        expect(errorKeys({ answer: "a".repeat(3001) })).toEqual(["errors.answerMax"])
    })

    it("valida a base legal: 500 aceita, 501 recusa", () => {
        expect(errorKeys({ legalBasis: "a".repeat(500) })).toEqual([])
        expect(errorKeys({ legalBasis: "a".repeat(501) })).toEqual(["errors.legalBasisMax"])
    })

    it("valida os documentos: vazio, 255, 256 e no máximo 30 itens", () => {
        expect(errorKeys({ requiredDocuments: ["RG", " "] })).toEqual(["errors.documentRequired"])
        expect(errorKeys({ requiredDocuments: ["a".repeat(255)] })).toEqual([])
        expect(errorKeys({ requiredDocuments: ["a".repeat(256)] })).toEqual(["errors.documentMax"])
        const thirty = Array.from({ length: 30 }, (_, index) => `Doc ${index}`)
        expect(errorKeys({ requiredDocuments: thirty })).toEqual([])
        expect(errorKeys({ requiredDocuments: [...thirty, "Doc 31"] })).toEqual([
            "errors.documentsMax"
        ])
    })

    it("valida a observação presencial só quando exige atendimento presencial", () => {
        expect(errorKeys({ requiresInPerson: true, inPersonNote: "a".repeat(500) })).toEqual([])
        expect(errorKeys({ requiresInPerson: true, inPersonNote: "a".repeat(501) })).toEqual([
            "errors.inPersonNoteMax"
        ])
        expect(errorKeys({ requiresInPerson: false, inPersonNote: "a".repeat(501) })).toEqual([])
    })

    it("recusa presencial e fora do escopo juntos", () => {
        expect(errorKeys({ requiresInPerson: true, outOfScope: true, llmAllowed: false })).toEqual([
            "errors.inPersonAndOutOfScope"
        ])
    })

    it("recusa fora do escopo com IA ligada", () => {
        expect(errorKeys({ outOfScope: true, llmAllowed: true })).toEqual([
            "errors.outOfScopeWithLlm"
        ])
    })

    it("avisa documento repetido sem bloquear", () => {
        const result = validateQuestionDraft({
            ...base,
            requiredDocuments: ["Nota fiscal", "nota físcal"]
        })

        expect(result.valid).toBe(true)
        expect(result.errors).toEqual([])
        expect(result.warnings).toEqual([
            { field: "requiredDocuments.1", key: "documentsField.repeated" }
        ])
    })
})
