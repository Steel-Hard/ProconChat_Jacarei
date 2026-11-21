import { describe, expect, it } from "vitest"
import buildContentSavePlan from "@/utils/content/buildContentSavePlan"
import addDraftCategory from "@/utils/content/draft/addDraftCategory"
import addDraftQuestion from "@/utils/content/draft/addDraftQuestion"
import deriveContentDraft from "@/utils/content/draft/deriveContentDraft"
import moveDraftCategory from "@/utils/content/draft/moveDraftCategory"
import moveDraftQuestion from "@/utils/content/draft/moveDraftQuestion"
import setDraftCategoryActive from "@/utils/content/draft/setDraftCategoryActive"
import setDraftQuestionActive from "@/utils/content/draft/setDraftQuestionActive"
import updateDraftCategory from "@/utils/content/draft/updateDraftCategory"
import updateDraftQuestion from "@/utils/content/draft/updateDraftQuestion"
import type ContentQuestionFormFields from "@/types/content/ContentQuestionFormFields.types"
import type ContentSnapshot from "@/types/content/ContentSnapshot.types"

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
    categories: [category(1), category(2)],
    questionsByCategory: { 1: [question(10, 1), question(11, 1)], 2: [] }
}

const fields: ContentQuestionFormFields = {
    shortTitle: " Nova ",
    shortDescription: "",
    question: "Texto",
    answer: "Resposta",
    legalBasis: "",
    requiredDocuments: ["RG"],
    requiresInPerson: true,
    inPersonNote: " obs ",
    outOfScope: false,
    llmAllowed: true,
    active: true
}

const kinds = (plan: ReturnType<typeof buildContentSavePlan>) => plan.map((step) => step.kind)

describe("buildContentSavePlan", () => {
    it("devolve plano vazio sem alterações", () => {
        expect(buildContentSavePlan(snapshot, deriveContentDraft(snapshot))).toEqual([])
    })

    it("pergunta nova em categoria nova vem depois da criação da categoria e aponta a chave provisória", () => {
        let draft = addDraftCategory(deriveContentDraft(snapshot), {
            title: "Nova",
            shortTitle: "N",
            description: ""
        })
        draft = addDraftQuestion(draft, "nova-1", fields)

        const plan = buildContentSavePlan(snapshot, draft)

        expect(kinds(plan)).toEqual(["createCategory", "createQuestion"])
        expect(plan[1]).toMatchObject({ kind: "createQuestion", categoryKey: "nova-1" })
    })

    it("pergunta nova com o campo ativa desmarcado é criada inativa, num único passo", () => {
        const draft = addDraftQuestion(deriveContentDraft(snapshot), "1", {
            ...fields,
            active: false
        })

        const plan = buildContentSavePlan(snapshot, draft)

        expect(kinds(plan)).toEqual(["createQuestion"])
        expect(plan[0]).toMatchObject({ input: { active: false } })
    })

    it("segue a ordem dos seis grupos", () => {
        let draft = deriveContentDraft(snapshot)
        draft = addDraftCategory(draft, { title: "Nova", shortTitle: "N", description: "" })
        draft = updateDraftCategory(draft, "1", {
            title: "Mudou",
            shortTitle: "C1",
            description: ""
        })
        draft = addDraftQuestion(draft, "1", fields)
        draft = updateDraftQuestion(draft, "1", "10", { ...fields, answer: "Outra" })
        draft = moveDraftCategory(draft, "2", "up")
        draft = moveDraftQuestion(draft, "1", "11", "up")

        expect(kinds(buildContentSavePlan(snapshot, draft))).toEqual([
            "createCategory",
            "updateCategory",
            "createQuestion",
            "updateQuestion",
            "reorderCategories",
            "reorderQuestions"
        ])
    })

    it("só mudança de estado gera ativação e não edição", () => {
        let draft = setDraftCategoryActive(deriveContentDraft(snapshot), "1", false)
        draft = setDraftQuestionActive(draft, "1", "10", false)

        expect(buildContentSavePlan(snapshot, draft)).toEqual([
            { kind: "setCategoryActive", categoryKey: "1", active: false },
            { kind: "setQuestionActive", questionKey: "10", active: false }
        ])
    })

    it("categoria nova desativada gera criar e desativar", () => {
        let draft = addDraftCategory(deriveContentDraft(snapshot), {
            title: "Nova",
            shortTitle: "N",
            description: ""
        })
        draft = setDraftCategoryActive(draft, "nova-1", false)

        expect(buildContentSavePlan(snapshot, draft)).toEqual([
            {
                kind: "createCategory",
                categoryKey: "nova-1",
                input: { title: "Nova", shortTitle: "N", description: null }
            },
            { kind: "setCategoryActive", categoryKey: "nova-1", active: false }
        ])
    })

    it("nova no fim não gera reordenação", () => {
        let draft = addDraftCategory(deriveContentDraft(snapshot), {
            title: "Nova",
            shortTitle: "N",
            description: ""
        })
        draft = addDraftQuestion(draft, "1", fields)

        expect(kinds(buildContentSavePlan(snapshot, draft))).toEqual([
            "createCategory",
            "createQuestion"
        ])
    })

    it("ordem trocada gera reordenação com todas as chaves", () => {
        let draft = moveDraftCategory(deriveContentDraft(snapshot), "1", "down")
        draft = moveDraftQuestion(draft, "1", "10", "down")

        expect(buildContentSavePlan(snapshot, draft)).toEqual([
            { kind: "reorderCategories", categoryKeys: ["2", "1"] },
            { kind: "reorderQuestions", categoryKey: "1", questionKeys: ["11", "10"] }
        ])
    })

    it("criação e edição de pergunta levam todos os campos explícitos e aparados", () => {
        let draft = addDraftQuestion(deriveContentDraft(snapshot), "1", fields)
        draft = updateDraftQuestion(draft, "1", "10", { ...fields, outOfScope: true })

        const plan = buildContentSavePlan(snapshot, draft)

        expect(plan[1]).toEqual({
            kind: "updateQuestion",
            questionKey: "10",
            input: {
                shortTitle: "Nova",
                shortDescription: null,
                question: "Texto",
                answer: "Resposta",
                legalBasis: null,
                requiredDocuments: ["RG"],
                requiresInPerson: false,
                inPersonNote: null,
                outOfScope: true,
                llmAllowed: false,
                active: true
            }
        })
        expect(plan[0]).toMatchObject({
            kind: "createQuestion",
            input: { requiresInPerson: true, inPersonNote: "obs", llmAllowed: true, active: true }
        })
    })
})
