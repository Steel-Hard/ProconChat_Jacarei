import { describe, expect, it } from "vitest"
import addDraftCategory from "@/utils/content/draft/addDraftCategory"
import addDraftQuestion from "@/utils/content/draft/addDraftQuestion"
import applyCreatedIds from "@/utils/content/draft/applyCreatedIds"
import deriveContentDraft from "@/utils/content/draft/deriveContentDraft"
import moveDraftCategory from "@/utils/content/draft/moveDraftCategory"
import moveDraftQuestion from "@/utils/content/draft/moveDraftQuestion"
import reapplyDraftOnSnapshot from "@/utils/content/draft/reapplyDraftOnSnapshot"
import setDraftCategoryActive from "@/utils/content/draft/setDraftCategoryActive"
import setDraftQuestionActive from "@/utils/content/draft/setDraftQuestionActive"
import updateDraftCategory from "@/utils/content/draft/updateDraftCategory"
import updateDraftQuestion from "@/utils/content/draft/updateDraftQuestion"
import type ContentCategory from "@/types/content/ContentCategory.types"
import type ContentQuestion from "@/types/content/ContentQuestion.types"
import type ContentQuestionFormFields from "@/types/content/ContentQuestionFormFields.types"
import type ContentSnapshot from "@/types/content/ContentSnapshot.types"

function category(id: number, overrides: Partial<ContentCategory> = {}): ContentCategory {
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
        pageBreak: null,
        ...overrides
    }
}

function question(id: number, categoryId: number, overrides: Partial<ContentQuestion> = {}) {
    return {
        id,
        categoryId,
        categoryTitle: `Categoria ${categoryId}`,
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
        answerLengthWarningMessage: null,
        ...overrides
    } satisfies ContentQuestion
}

const snapshot: ContentSnapshot = {
    categories: [category(1), category(2)],
    questionsByCategory: {
        1: [question(10, 1), question(11, 1)],
        2: [question(20, 2)]
    }
}

const questionFields: ContentQuestionFormFields = {
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

describe("deriveContentDraft", () => {
    it("deriva o rascunho do retrato na mesma ordem, com chaves de id e textos vazios", () => {
        const draft = deriveContentDraft(snapshot)

        expect(draft.categories.map((item) => item.key)).toEqual(["1", "2"])
        expect(draft.categories[0].id).toBe(1)
        expect(draft.categories[0].description).toBe("")
        expect(draft.questionsByCategory["1"].map((item) => item.key)).toEqual(["10", "11"])
        expect(draft.questionsByCategory["1"][0].categoryKey).toBe("1")
        expect(draft.questionsByCategory["1"][0].legalBasis).toBe("")
        expect(draft.nextNewKey).toBe(1)
    })
})

describe("addDraftCategory", () => {
    it("coloca a categoria nova no fim, ativa, com chave provisória", () => {
        const draft = deriveContentDraft(snapshot)

        const next = addDraftCategory(draft, { title: "Nova", shortTitle: "N", description: "" })

        const created = next.categories[2]
        expect(created.key).toBe("nova-1")
        expect(created.id).toBeNull()
        expect(created.active).toBe(true)
        expect(next.questionsByCategory["nova-1"]).toEqual([])
        expect(next.nextNewKey).toBe(2)
        expect(draft.categories).toHaveLength(2)
    })
})

describe("addDraftQuestion", () => {
    it("coloca a pergunta nova no fim da categoria, ativa e com IA ligada", () => {
        const draft = deriveContentDraft(snapshot)

        const next = addDraftQuestion(draft, "1", {
            ...questionFields,
            active: false,
            llmAllowed: false
        })

        const created = next.questionsByCategory["1"][2]
        expect(created.key).toBe("nova-1")
        expect(created.id).toBeNull()
        expect(created.categoryKey).toBe("1")
        expect(created.active).toBe(true)
        expect(created.llmAllowed).toBe(true)
        expect(draft.questionsByCategory["1"]).toHaveLength(2)
    })

    it("mantém fora do escopo sem IA na pergunta nova", () => {
        const draft = deriveContentDraft(snapshot)

        const next = addDraftQuestion(draft, "1", { ...questionFields, outOfScope: true })

        expect(next.questionsByCategory["1"][2].llmAllowed).toBe(false)
    })
})

describe("updateDraftCategory", () => {
    it("troca os campos sem mudar o estado", () => {
        const draft = deriveContentDraft(snapshot)

        const next = updateDraftCategory(draft, "1", {
            title: "Outro",
            shortTitle: "O",
            description: "d"
        })

        expect(next.categories[0]).toMatchObject({
            title: "Outro",
            shortTitle: "O",
            description: "d",
            active: true
        })
    })
})

describe("updateDraftQuestion", () => {
    it("desliga a IA e desmarca presencial ao marcar fora do escopo", () => {
        const draft = deriveContentDraft(snapshot)

        const next = updateDraftQuestion(draft, "1", "10", {
            ...questionFields,
            requiresInPerson: true,
            inPersonNote: "x",
            outOfScope: true
        })

        const updated = next.questionsByCategory["1"][0]
        expect(updated.llmAllowed).toBe(false)
        expect(updated.requiresInPerson).toBe(false)
        expect(updated.inPersonNote).toBe("")
    })

    it("religa a IA ao desmarcar fora do escopo", () => {
        const base = deriveContentDraft({
            ...snapshot,
            questionsByCategory: {
                ...snapshot.questionsByCategory,
                1: [question(10, 1, { outOfScope: true, llmAllowed: false })]
            }
        })

        const next = updateDraftQuestion(base, "1", "10", {
            ...questionFields,
            outOfScope: false,
            llmAllowed: false
        })

        expect(next.questionsByCategory["1"][0].llmAllowed).toBe(true)
    })

    it("limpa a observação presencial ao desmarcar presencial", () => {
        const draft = deriveContentDraft(snapshot)

        const next = updateDraftQuestion(draft, "1", "10", {
            ...questionFields,
            requiresInPerson: false,
            inPersonNote: "sobrou"
        })

        expect(next.questionsByCategory["1"][0].inPersonNote).toBe("")
    })

    it("aplica o campo ativo do formulário", () => {
        const draft = deriveContentDraft(snapshot)

        const next = updateDraftQuestion(draft, "1", "10", { ...questionFields, active: false })

        expect(next.questionsByCategory["1"][0].active).toBe(false)
    })
})

describe("setDraftCategoryActive e setDraftQuestionActive", () => {
    it("desativar a categoria não muda as perguntas", () => {
        const draft = deriveContentDraft(snapshot)

        const next = setDraftCategoryActive(draft, "1", false)

        expect(next.categories[0].active).toBe(false)
        expect(next.questionsByCategory["1"].every((item) => item.active)).toBe(true)
    })

    it("ativa e desativa a pergunta", () => {
        const draft = deriveContentDraft(snapshot)

        const next = setDraftQuestionActive(draft, "1", "11", false)

        expect(next.questionsByCategory["1"][1].active).toBe(false)
        expect(next.questionsByCategory["1"][0].active).toBe(true)
    })
})

describe("moveDraftCategory e moveDraftQuestion", () => {
    it("troca a categoria com a vizinha", () => {
        const draft = deriveContentDraft(snapshot)

        const down = moveDraftCategory(draft, "1", "down")
        const up = moveDraftCategory(down, "1", "up")

        expect(down.categories.map((item) => item.key)).toEqual(["2", "1"])
        expect(up.categories.map((item) => item.key)).toEqual(["1", "2"])
    })

    it("não mexe nas pontas", () => {
        const draft = deriveContentDraft(snapshot)

        expect(moveDraftCategory(draft, "1", "up")).toBe(draft)
        expect(moveDraftCategory(draft, "2", "down")).toBe(draft)
        expect(moveDraftQuestion(draft, "1", "10", "up")).toBe(draft)
        expect(moveDraftQuestion(draft, "1", "11", "down")).toBe(draft)
    })

    it("troca a pergunta com a vizinha dentro da categoria", () => {
        const draft = deriveContentDraft(snapshot)

        const next = moveDraftQuestion(draft, "1", "10", "down")

        expect(next.questionsByCategory["1"].map((item) => item.key)).toEqual(["11", "10"])
    })
})

describe("applyCreatedIds", () => {
    it("troca as chaves provisórias pelos ids reais, inclusive na categoria das perguntas", () => {
        let draft = deriveContentDraft(snapshot)
        draft = addDraftCategory(draft, { title: "N", shortTitle: "N", description: "" })
        draft = addDraftQuestion(draft, "nova-1", questionFields)
        draft = addDraftQuestion(draft, "1", questionFields)

        const next = applyCreatedIds(draft, { "nova-1": 30, "nova-2": 31 })

        const createdCategory = next.categories[2]
        expect(createdCategory.key).toBe("30")
        expect(createdCategory.id).toBe(30)
        expect(next.questionsByCategory["nova-1"]).toBeUndefined()
        expect(next.questionsByCategory["30"][0]).toMatchObject({
            key: "31",
            id: 31,
            categoryKey: "30"
        })
        expect(next.questionsByCategory["1"][2].key).toBe("nova-3")
    })
})

describe("reapplyDraftOnSnapshot", () => {
    it("mantém as pendências e acrescenta no fim o que existe só no servidor", () => {
        let draft = deriveContentDraft(snapshot)
        draft = setDraftQuestionActive(draft, "1", "10", false)
        draft = addDraftCategory(draft, { title: "N", shortTitle: "N", description: "" })
        const fresh: ContentSnapshot = {
            categories: [category(1), category(2), category(3)],
            questionsByCategory: {
                1: [question(10, 1), question(11, 1), question(12, 1)],
                2: [question(20, 2)],
                3: [question(30, 3)]
            }
        }

        const next = reapplyDraftOnSnapshot(draft, fresh)

        expect(next.categories.map((item) => item.key)).toEqual(["1", "2", "nova-1", "3"])
        expect(next.questionsByCategory["1"].map((item) => item.key)).toEqual(["10", "11", "12"])
        expect(next.questionsByCategory["1"][0].active).toBe(false)
        expect(next.questionsByCategory["3"].map((item) => item.key)).toEqual(["30"])
    })

    it("traz o autor e a data do servidor para os itens que já existiam", () => {
        const draft = deriveContentDraft(snapshot)
        const fresh: ContentSnapshot = {
            ...snapshot,
            categories: [
                category(1, {
                    updatedBy: { id: 1, name: "Ana" },
                    updatedAt: "2026-11-05T10:00:00.000Z"
                }),
                category(2)
            ]
        }

        const next = reapplyDraftOnSnapshot(draft, fresh)

        expect(next.categories[0].updatedBy).toEqual({ id: 1, name: "Ana" })
        expect(next.categories[0].updatedAt).toBe("2026-11-05T10:00:00.000Z")
    })
})
