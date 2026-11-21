import { afterEach, describe, expect, it, vi } from "vitest"

const BASE = "https://api.example.com/api/v1/content"

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" }
    })
}

function category(id: number) {
    return { id, title: `Categoria ${id}`, shortTitle: `C${id}` }
}

function question(id: number, categoryId: number) {
    return { id, categoryId, shortTitle: `P${id}` }
}

async function setup(handler: (request: Request) => Response) {
    vi.stubEnv("VITE_API_URL", "https://api.example.com")
    vi.resetModules()
    const fetchMock = vi.fn(async (request: Request) => handler(request))
    vi.stubGlobal("fetch", fetchMock)
    const { default: contentApi } = await import("@/store/api/content.api")
    const { default: createStore } = await import("@/store/createStore")
    const store = createStore()

    return { contentApi, store, fetchMock }
}

function requestAt(fetchMock: ReturnType<typeof vi.fn>, index: number): Request {
    return fetchMock.mock.calls[index][0] as Request
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("contentApi", () => {
    it("cria categoria em POST /categories e devolve o data", async () => {
        const created = category(7)
        const { contentApi, store, fetchMock } = await setup(() =>
            jsonResponse({ data: created }, 201)
        )
        const body = { title: "Contratos", shortTitle: "Contratos", description: null }

        const result = await store.dispatch(
            contentApi.endpoints.createContentCategory.initiate(body)
        )

        expect(result.data).toEqual(created)
        expect(requestAt(fetchMock, 0).method).toBe("POST")
        expect(requestAt(fetchMock, 0).url).toBe(`${BASE}/categories`)
        expect(await requestAt(fetchMock, 0).json()).toEqual(body)
    })

    it("edita categoria em PUT /categories/:id com o corpo completo", async () => {
        const { contentApi, store, fetchMock } = await setup(() =>
            jsonResponse({ data: category(3) })
        )
        const body = { title: "A", shortTitle: "A", description: "d", active: false }

        await store.dispatch(contentApi.endpoints.updateContentCategory.initiate({ id: 3, body }))

        expect(requestAt(fetchMock, 0).method).toBe("PUT")
        expect(requestAt(fetchMock, 0).url).toBe(`${BASE}/categories/3`)
        expect(await requestAt(fetchMock, 0).json()).toEqual(body)
    })

    it("ativa e desativa categoria em PATCH /categories/:id/active", async () => {
        const { contentApi, store, fetchMock } = await setup(() =>
            jsonResponse({ data: category(3) })
        )

        await store.dispatch(
            contentApi.endpoints.setContentCategoryActive.initiate({ id: 3, active: false })
        )

        expect(requestAt(fetchMock, 0).method).toBe("PATCH")
        expect(requestAt(fetchMock, 0).url).toBe(`${BASE}/categories/3/active`)
        expect(await requestAt(fetchMock, 0).json()).toEqual({ active: false })
    })

    it("reordena categorias em PUT /categories/reorder com todos os ids", async () => {
        const { contentApi, store, fetchMock } = await setup(() =>
            jsonResponse({ data: [category(2), category(1)] })
        )

        await store.dispatch(
            contentApi.endpoints.reorderContentCategories.initiate({ categoryIds: [2, 1] })
        )

        expect(requestAt(fetchMock, 0).method).toBe("PUT")
        expect(requestAt(fetchMock, 0).url).toBe(`${BASE}/categories/reorder`)
        expect(await requestAt(fetchMock, 0).json()).toEqual({ categoryIds: [2, 1] })
    })

    it("cria, edita e ativa pergunta nas rotas de /questions", async () => {
        const { contentApi, store, fetchMock } = await setup(() =>
            jsonResponse({ data: question(9, 1) })
        )
        const input = {
            shortTitle: "Troca",
            shortDescription: null,
            question: "Posso trocar?",
            answer: "Pode.",
            legalBasis: null,
            requiredDocuments: [],
            requiresInPerson: false,
            inPersonNote: null,
            outOfScope: false,
            llmAllowed: true,
            active: true
        }

        await store.dispatch(
            contentApi.endpoints.createContentQuestion.initiate({ ...input, categoryId: 1 })
        )
        await store.dispatch(
            contentApi.endpoints.updateContentQuestion.initiate({ id: 9, body: input })
        )
        await store.dispatch(
            contentApi.endpoints.setContentQuestionActive.initiate({ id: 9, active: false })
        )

        expect(requestAt(fetchMock, 0).method).toBe("POST")
        expect(requestAt(fetchMock, 0).url).toBe(`${BASE}/questions`)
        expect(await requestAt(fetchMock, 0).json()).toEqual({ ...input, categoryId: 1 })
        expect(requestAt(fetchMock, 1).method).toBe("PUT")
        expect(requestAt(fetchMock, 1).url).toBe(`${BASE}/questions/9`)
        expect(requestAt(fetchMock, 2).method).toBe("PATCH")
        expect(requestAt(fetchMock, 2).url).toBe(`${BASE}/questions/9/active`)
    })

    it("reordena perguntas em PUT /categories/:id/questions/reorder", async () => {
        const { contentApi, store, fetchMock } = await setup(() => jsonResponse({ data: [] }))

        await store.dispatch(
            contentApi.endpoints.reorderContentQuestions.initiate({
                categoryId: 4,
                questionIds: [2, 1]
            })
        )

        expect(requestAt(fetchMock, 0).method).toBe("PUT")
        expect(requestAt(fetchMock, 0).url).toBe(`${BASE}/categories/4/questions/reorder`)
        expect(await requestAt(fetchMock, 0).json()).toEqual({ questionIds: [2, 1] })
    })

    it("pede a prévia em POST /questions/preview", async () => {
        const { contentApi, store, fetchMock } = await setup(() =>
            jsonResponse({ data: { fixedDisclaimer: "x" } })
        )
        const args = {
            categoryId: 1,
            shortTitle: "Troca",
            shortDescription: null,
            question: "Posso trocar?",
            answer: "Pode.",
            legalBasis: null,
            requiredDocuments: [],
            requiresInPerson: false,
            inPersonNote: null,
            outOfScope: false,
            llmAllowed: true
        }

        const result = await store.dispatch(
            contentApi.endpoints.previewContentQuestion.initiate(args)
        )

        expect(result.data).toEqual({ fixedDisclaimer: "x" })
        expect(requestAt(fetchMock, 0).method).toBe("POST")
        expect(requestAt(fetchMock, 0).url).toBe(`${BASE}/questions/preview`)
    })

    it("carrega o retrato com uma chamada de categorias e uma de perguntas por categoria", async () => {
        const { contentApi, store, fetchMock } = await setup((request) => {
            const url = request.url
            if (url === `${BASE}/categories`) {
                return jsonResponse({ data: [category(1), category(2)] })
            }
            if (url === `${BASE}/categories/1/questions`) {
                return jsonResponse({ data: [question(10, 1)] })
            }
            return jsonResponse({ data: [question(20, 2), question(21, 2)] })
        })

        const result = await store.dispatch(contentApi.endpoints.getContentSnapshot.initiate())

        expect(fetchMock).toHaveBeenCalledTimes(3)
        expect(result.data?.categories.map((item) => item.id)).toEqual([1, 2])
        expect(result.data?.questionsByCategory[1].map((item) => item.id)).toEqual([10])
        expect(result.data?.questionsByCategory[2].map((item) => item.id)).toEqual([20, 21])
    })

    it("não busca o retrato de novo depois de uma gravação", async () => {
        const { contentApi, store, fetchMock } = await setup((request) => {
            if (request.method === "GET" && request.url === `${BASE}/categories`) {
                return jsonResponse({ data: [category(1)] })
            }
            if (request.method === "GET") {
                return jsonResponse({ data: [] })
            }
            return jsonResponse({ data: category(1) })
        })

        await store.dispatch(contentApi.endpoints.getContentSnapshot.initiate())
        const before = fetchMock.mock.calls.length
        await store.dispatch(
            contentApi.endpoints.setContentCategoryActive.initiate({ id: 1, active: false })
        )

        expect(fetchMock.mock.calls.length).toBe(before + 1)
    })

    it("devolve o erro quando uma chamada do retrato falha", async () => {
        const { contentApi, store } = await setup(() =>
            jsonResponse({ error: { message: "x" } }, 500)
        )

        const result = await store.dispatch(contentApi.endpoints.getContentSnapshot.initiate())

        expect(result.error).toBeDefined()
    })
})
