import { describe, expect, it } from "vitest"
import addDraftCategory from "@/utils/content/draft/addDraftCategory"
import addDraftQuestion from "@/utils/content/draft/addDraftQuestion"
import deriveContentDraft from "@/utils/content/draft/deriveContentDraft"
import moveDraftCategory from "@/utils/content/draft/moveDraftCategory"
import moveDraftQuestion from "@/utils/content/draft/moveDraftQuestion"
import setDraftCategoryActive from "@/utils/content/draft/setDraftCategoryActive"
import setDraftQuestionActive from "@/utils/content/draft/setDraftQuestionActive"
import updateDraftCategory from "@/utils/content/draft/updateDraftCategory"
import updateDraftQuestion from "@/utils/content/draft/updateDraftQuestion"
import contentChangesOf from "@/utils/content/contentChanges"
import type ContentSnapshot from "@/types/content/ContentSnapshot.types"
import type ContentQuestionFormFields from "@/types/content/ContentQuestionFormFields.types"

function category(id: number) {
    return {
        id,
        title: `Categoria ${id}`,
        shortTitle: `C${id}`,
        description: null,
        active: true,
        position: id,
        questionsCount: 0,
        activeQuestionsCount: 0,
        updatedBy: null,
        updatedAt: "2026-11-01T10:00:00.000Z",
        hiddenInChatbot: false,
        whatsappPage: null,
        pageBreak: null
    }
}

function question(id: number, categoryId: number) {
    return {
        id,
        categoryId,
        categoryTitle: "x",
        shortTitle: `P${id}`,
        shortDescription: null,
        question: `Pergunta ${id}`,
        answer: `Resposta ${id}`,
        legalBasis: null,
        requiredDocuments: [],
        requiresInPerson: false,
        inPersonNote: null,
        outOfScope: false,
        llmAllowed: true,
        active: true,
        position: id,
        updatedBy: null,
        updatedAt: "2026-11-01T10:00:00.000Z",
        whatsappPage: null,
        pageBreak: null,
        answerLengthWarning: false,
        answerLengthWarningMessage: null
    }
}

const snapshot: ContentSnapshot = {
    categories: [category(1), category(2), category(3)],
    questionsByCategory: {
        1: [question(10, 1), question(11, 1), question(12, 1)],
        2: [],
        3: []
    }
}

const fields: ContentQuestionFormFields = {
    shortTitle: "Nova",
    shortDescription: "",
    question: "Texto",
    answer: "Resposta",
    legalBasis: "",
    requiredDocuments: [],
    requiresInPerson: false,
    inPersonNote: "",
    outOfScope: false,
    llmAllowed: true,
    active: true
}

describe("contentChangesOf", () => {
    it("não tem diferença quando o rascunho é igual ao gravado", () => {
        expect(contentChangesOf(deriveContentDraft(snapshot), snapshot)).toEqual([])
    })

    it("mover para cima e para baixo não conta alteração", () => {
        const draft = deriveContentDraft(snapshot)

        const moved = moveDraftQuestion(
            moveDraftQuestion(draft, "1", "11", "up"),
            "1",
            "11",
            "down"
        )
        const movedCategory = moveDraftCategory(moveDraftCategory(draft, "2", "down"), "2", "up")

        expect(contentChangesOf(moved, snapshot)).toEqual([])
        expect(contentChangesOf(movedCategory, snapshot)).toEqual([])
    })

    it("desativar e ativar de novo não conta", () => {
        const draft = setDraftQuestionActive(
            setDraftQuestionActive(deriveContentDraft(snapshot), "1", "10", false),
            "1",
            "10",
            true
        )

        expect(contentChangesOf(draft, snapshot)).toEqual([])
    })

    it("conta uma entrada por mudança de estado", () => {
        const draft = setDraftCategoryActive(deriveContentDraft(snapshot), "1", false)

        expect(contentChangesOf(draft, snapshot)).toEqual([
            { kind: "categoryState", name: "C1", active: false }
        ])
    })

    it("conta uma entrada por item novo mesmo editado depois", () => {
        let draft = addDraftCategory(deriveContentDraft(snapshot), {
            title: "N",
            shortTitle: "N",
            description: ""
        })
        draft = updateDraftCategory(draft, "nova-1", {
            title: "N2",
            shortTitle: "N2",
            description: "x"
        })
        draft = addDraftQuestion(draft, "1", fields)
        draft = updateDraftQuestion(draft, "1", "nova-2", { ...fields, answer: "Outra" })

        expect(contentChangesOf(draft, snapshot)).toEqual([
            { kind: "categoryNew", name: "N2" },
            { kind: "questionNew", name: "Nova" }
        ])
    })

    it("conta o item existente com campo diferente uma vez e deixa de contar ao voltar", () => {
        const original = deriveContentDraft(snapshot)
        let draft = updateDraftQuestion(original, "1", "10", {
            ...fields,
            shortTitle: "P10",
            question: "Pergunta 10",
            answer: "Mudou"
        })

        expect(contentChangesOf(draft, snapshot)).toEqual([
            { kind: "questionChanged", name: "P10" }
        ])

        draft = updateDraftQuestion(draft, "1", "10", {
            ...fields,
            shortTitle: "P10",
            question: "Pergunta 10",
            answer: "Resposta 10"
        })

        expect(contentChangesOf(draft, snapshot)).toEqual([])
    })

    it("conta a lista reordenada uma vez e deixa de contar ao voltar à ordem gravada", () => {
        let draft = moveDraftQuestion(deriveContentDraft(snapshot), "1", "10", "down")
        draft = moveDraftQuestion(draft, "1", "10", "down")

        expect(contentChangesOf(draft, snapshot)).toEqual([{ kind: "questionsOrder", name: "C1" }])

        draft = moveDraftQuestion(moveDraftQuestion(draft, "1", "10", "up"), "1", "10", "up")

        expect(contentChangesOf(draft, snapshot)).toEqual([])
    })

    it("conta a ordem das categorias ignorando as novas", () => {
        let draft = moveDraftCategory(deriveContentDraft(snapshot), "1", "down")
        draft = addDraftCategory(draft, { title: "N", shortTitle: "N", description: "" })

        expect(contentChangesOf(draft, snapshot)).toEqual([
            { kind: "categoryNew", name: "N" },
            { kind: "categoriesOrder", name: "" }
        ])
    })
})
