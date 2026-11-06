import type { ReactNode } from "react"
import { Provider } from "react-redux"
import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const FAILURES_PATH = "/api/v1/whatsapp/settings/delivery-failures"
const HISTORY_PATH = "/api/v1/whatsapp/settings/history"
const FAILURES = { since: "2026-11-03T00:00:00.000Z", count: 0, items: [] }
const HISTORY = {
    items: [
        {
            id: "history-1",
            action: "credentials_saved",
            fields: ["accessToken"],
            actor: { id: 2, name: "Bruno Lima" },
            createdAt: "2026-11-02T18:30:00.000Z"
        }
    ]
}

type Reply = { status: number; body?: unknown }

function respond(reply: Reply): Response {
    return new Response(JSON.stringify(reply.body ?? null), {
        status: reply.status,
        headers: { "Content-Type": "application/json" }
    })
}

function stubApi(replies: Record<string, Reply>) {
    const paths: string[] = []
    const fetchMock = vi.fn(async (input: Request) => {
        const path = new URL(input.url).pathname
        paths.push(path)

        return respond(replies[path] ?? { status: 404 })
    })
    vi.stubGlobal("fetch", fetchMock)

    return paths
}

async function setup(active: boolean, replies: Record<string, Reply> = {}) {
    vi.stubEnv("VITE_API_URL", "http://api.test")
    vi.resetModules()
    const paths = stubApi({
        [FAILURES_PATH]: { status: 200, body: { data: FAILURES } },
        [HISTORY_PATH]: { status: 200, body: { data: HISTORY } },
        ...replies
    })
    const { default: createStore } = await import("@/store/createStore")
    const { default: useWhatsAppActivity } = await import("@/pages/hooks/useWhatsAppActivity")
    const store = createStore()
    const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider store={store}>{children}</Provider>
    )
    const rendered = renderHook(() => useWhatsAppActivity(active), { wrapper })

    return { ...rendered, paths }
}

function settle(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0))
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("useWhatsAppActivity", () => {
    it("fica parado e não pede falhas nem histórico quando não está ativo", async () => {
        const { result, paths } = await setup(false)

        await act(async () => {
            await settle()
        })

        expect(result.current.failures.status).toBe("idle")
        expect(result.current.history.status).toBe("idle")
        expect(paths).not.toContain(FAILURES_PATH)
        expect(paths).not.toContain(HISTORY_PATH)
    })

    it("começa carregando e fica pronto com o data das duas respostas", async () => {
        const { result } = await setup(true)

        expect(result.current.failures.status).toBe("loading")
        expect(result.current.history.status).toBe("loading")
        await waitFor(() => expect(result.current.failures.status).toBe("ready"))
        await waitFor(() => expect(result.current.history.status).toBe("ready"))
        expect(result.current.failures.data).toEqual(FAILURES)
        expect(result.current.history.data).toEqual(HISTORY)
    })

    it("marca erro só nas falhas quando a leitura das falhas falha", async () => {
        const { result } = await setup(true, {
            [FAILURES_PATH]: {
                status: 500,
                body: { error: { code: "INTERNAL_SERVER_ERROR", message: "x" } }
            }
        })

        await waitFor(() => expect(result.current.history.status).toBe("ready"))
        await waitFor(() => expect(result.current.failures.status).toBe("error"))
    })
})
