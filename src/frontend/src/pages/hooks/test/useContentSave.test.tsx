import type { ReactNode } from "react"
import { Provider } from "react-redux"
import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type ContentSavePlanStep from "@/types/content/ContentSavePlanStep.types"

const BASE = "http://api.test/api/v1/content"

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" }
    })
}

function category(id: number) {
    return { id, title: `T${id}`, shortTitle: `C${id}` }
}

async function setup(handler: (request: Request) => Response) {
    vi.stubEnv("VITE_API_URL", "http://api.test")
    vi.resetModules()
    const fetchMock = vi.fn(async (request: Request) => handler(request))
    vi.stubGlobal("fetch", fetchMock)
    const { default: createStore } = await import("@/store/createStore")
    const { default: useContentSave } = await import("@/pages/hooks/useContentSave")
    const store = createStore()

    function Wrapper({ children }: { children: ReactNode }) {
        return <Provider store={store}>{children}</Provider>
    }

    const hook = renderHook(() => useContentSave(), { wrapper: Wrapper })

    return { ...hook, fetchMock }
}

function urlsOf(fetchMock: ReturnType<typeof vi.fn>): string[] {
    return fetchMock.mock.calls.map(
        ([request]) => `${(request as Request).method} ${(request as Request).url}`
    )
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

const plan: ContentSavePlanStep[] = [
    {
        kind: "createCategory",
        categoryKey: "nova-1",
        input: { title: "N", shortTitle: "N", description: null }
    },
    { kind: "setCategoryActive", categoryKey: "1", active: false }
]

describe("useContentSave", () => {
    it("grava na ordem do plano e recarrega o retrato uma única vez no fim", async () => {
        const { result, fetchMock } = await setup((request) => {
            if (request.method === "POST") {
                return json({ data: category(9) }, 201)
            }
            if (request.method === "PATCH") {
                return json({ data: category(1) })
            }
            if (request.url === `${BASE}/categories`) {
                return json({ data: [category(1), category(9)] })
            }
            return json({ data: [] })
        })

        let outcome: Awaited<ReturnType<typeof result.current.save>> = null
        await act(async () => {
            outcome = await result.current.save(plan)
        })

        expect(urlsOf(fetchMock)).toEqual([
            `POST ${BASE}/categories`,
            `PATCH ${BASE}/categories/1/active`,
            `GET ${BASE}/categories`,
            `GET ${BASE}/categories/1/questions`,
            `GET ${BASE}/categories/9/questions`
        ])
        expect(outcome).toMatchObject({ completed: 2, total: 2, failure: null })
        expect(outcome!.snapshot?.categories.map((item) => item.id)).toEqual([1, 9])
    })

    it("depois de falha parcial devolve o mapa de ids, recarrega e um novo Salvar não recria a categoria", async () => {
        let failActive = true
        const { result, fetchMock } = await setup((request) => {
            if (request.method === "POST") {
                return json({ data: category(9) }, 201)
            }
            if (request.method === "PATCH") {
                return failActive
                    ? json({ error: { message: "x" } }, 500)
                    : json({ data: category(1) })
            }
            if (request.url === `${BASE}/categories`) {
                return json({ data: [category(1), category(9)] })
            }
            return json({ data: [] })
        })

        let first: Awaited<ReturnType<typeof result.current.save>> = null
        await act(async () => {
            first = await result.current.save(plan)
        })

        expect(first).toMatchObject({ completed: 1, total: 2, idMap: { "nova-1": 9 } })
        expect(first!.failure?.kind).toBe("generic")
        expect(first!.snapshot).not.toBeNull()

        failActive = false
        fetchMock.mockClear()
        await act(async () => {
            await result.current.save(plan.slice(1))
        })

        expect(urlsOf(fetchMock).filter((url) => url.startsWith("POST"))).toEqual([])
    })

    it("não envia nada de novo enquanto o Salvar está em andamento", async () => {
        const { result, fetchMock } = await setup((request) => {
            if (request.method === "PATCH") {
                return json({ data: category(1) })
            }
            return json({ data: [] })
        })
        const single: ContentSavePlanStep[] = [plan[1]]

        await act(async () => {
            const first = result.current.save(single)
            const second = await result.current.save(single)
            expect(second).toBeNull()
            await first
        })

        expect(urlsOf(fetchMock).filter((url) => url.startsWith("PATCH"))).toHaveLength(1)
    })

    it("não recarrega quando o plano é vazio", async () => {
        const { result, fetchMock } = await setup(() => json({ data: [] }))

        await act(async () => {
            await result.current.save([])
        })

        expect(fetchMock).not.toHaveBeenCalled()
    })
})
