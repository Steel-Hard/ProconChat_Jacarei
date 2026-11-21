import { describe, expect, it, vi } from "vitest"
import executeContentSavePlan from "@/utils/content/executeContentSavePlan"
import type ContentSaveApi from "@/types/content/ContentSaveApi.types"
import type ContentSavePlanStep from "@/types/content/ContentSavePlanStep.types"
import type ContentQuestionInput from "@/types/content/ContentQuestionInput.types"

const questionInput: ContentQuestionInput = {
    shortTitle: "P",
    shortDescription: null,
    question: "q",
    answer: "a",
    legalBasis: null,
    requiredDocuments: [],
    requiresInPerson: false,
    inPersonNote: null,
    outOfScope: false,
    llmAllowed: true,
    active: true
}

function buildApi(overrides: Partial<ContentSaveApi> = {}) {
    let nextId = 100
    const calls: string[] = []
    const api: ContentSaveApi = {
        createCategory: vi.fn(async () => {
            calls.push("createCategory")
            return { id: nextId++ }
        }),
        updateCategory: vi.fn(async () => {
            calls.push("updateCategory")
        }),
        setCategoryActive: vi.fn(async () => {
            calls.push("setCategoryActive")
        }),
        createQuestion: vi.fn(async () => {
            calls.push("createQuestion")
            return { id: nextId++ }
        }),
        updateQuestion: vi.fn(async () => {
            calls.push("updateQuestion")
        }),
        setQuestionActive: vi.fn(async () => {
            calls.push("setQuestionActive")
        }),
        reorderCategories: vi.fn(async () => {
            calls.push("reorderCategories")
        }),
        reorderQuestions: vi.fn(async () => {
            calls.push("reorderQuestions")
        }),
        ...overrides
    }

    return { api, calls }
}

const plan: ContentSavePlanStep[] = [
    {
        kind: "createCategory",
        categoryKey: "nova-1",
        input: { title: "N", shortTitle: "N", description: null }
    },
    { kind: "createQuestion", questionKey: "nova-2", categoryKey: "nova-1", input: questionInput },
    { kind: "setQuestionActive", questionKey: "10", active: false },
    { kind: "reorderCategories", categoryKeys: ["2", "1", "nova-1"] },
    { kind: "reorderQuestions", categoryKey: "nova-1", questionKeys: ["nova-2"] }
]

describe("executeContentSavePlan", () => {
    it("executa em sequência e resolve as chaves provisórias pelo mapa de ids", async () => {
        const { api, calls } = buildApi()

        const result = await executeContentSavePlan(plan, api)

        expect(calls).toEqual([
            "createCategory",
            "createQuestion",
            "setQuestionActive",
            "reorderCategories",
            "reorderQuestions"
        ])
        expect(api.createQuestion).toHaveBeenCalledWith(100, questionInput)
        expect(api.setQuestionActive).toHaveBeenCalledWith(10, false)
        expect(api.reorderCategories).toHaveBeenCalledWith([2, 1, 100])
        expect(api.reorderQuestions).toHaveBeenCalledWith(100, [101])
        expect(result).toEqual({
            idMap: { "nova-1": 100, "nova-2": 101 },
            completed: 5,
            total: 5,
            failure: null
        })
    })

    it("falha na primeira gravação: nada foi gravado", async () => {
        const { api } = buildApi({
            createCategory: vi.fn(async () => {
                throw { status: 500 }
            })
        })

        const result = await executeContentSavePlan(plan, api)

        expect(result.completed).toBe(0)
        expect(result.idMap).toEqual({})
        expect(result.failure?.kind).toBe("generic")
        expect(api.createQuestion).not.toHaveBeenCalled()
    })

    it("falha no terceiro passo para ali e devolve o mapa dos dois primeiros", async () => {
        const { api } = buildApi({
            setQuestionActive: vi.fn(async () => {
                throw { status: 500 }
            })
        })

        const result = await executeContentSavePlan(plan, api)

        expect(result.completed).toBe(2)
        expect(result.total).toBe(5)
        expect(result.idMap).toEqual({ "nova-1": 100, "nova-2": 101 })
        expect(result.failure?.step).toEqual(plan[2])
        expect(api.reorderCategories).not.toHaveBeenCalled()
    })

    it("depois da falha parcial, executar só o que faltou não recria a categoria já criada", async () => {
        const { api } = buildApi()

        const result = await executeContentSavePlan(plan.slice(2), api)

        expect(api.createCategory).not.toHaveBeenCalled()
        expect(result.failure).toBeNull()
    })

    it("classifica 409 em categoria como nome repetido", async () => {
        const { api } = buildApi({
            createCategory: vi.fn(async () => {
                throw { status: 409, data: { error: { message: "dup" } } }
            })
        })

        const result = await executeContentSavePlan(plan, api)

        expect(result.failure).toMatchObject({ kind: "duplicateName", message: "dup" })
    })

    it("classifica 403 como sem permissão e 401 como sessão expirada", async () => {
        const forbidden = buildApi({
            createCategory: vi.fn(async () => {
                throw { status: 403 }
            })
        })
        const unauthorized = buildApi({
            createCategory: vi.fn(async () => {
                throw { status: 401 }
            })
        })

        expect((await executeContentSavePlan(plan, forbidden.api)).failure?.kind).toBe("forbidden")
        expect((await executeContentSavePlan(plan, unauthorized.api)).failure?.kind).toBe(
            "unauthorized"
        )
    })

    it("classifica a reordenação recusada com 400", async () => {
        const { api } = buildApi({
            reorderCategories: vi.fn(async () => {
                throw { status: 400, data: { error: { message: "ids" } } }
            })
        })

        const result = await executeContentSavePlan(plan, api)

        expect(result.failure).toMatchObject({ kind: "reorderRefused", message: "ids" })
        expect(result.completed).toBe(3)
    })

    it("devolve sucesso com plano vazio", async () => {
        const { api } = buildApi()

        expect(await executeContentSavePlan([], api)).toEqual({
            idMap: {},
            completed: 0,
            total: 0,
            failure: null
        })
    })
})
