import type { ReactNode } from "react"
import { Provider } from "react-redux"
import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import buildBookedDays from "@/testUtils/buildBookedDays"
import scheduleApiStub from "@/testUtils/scheduleApiStub"

vi.setConfig({ testTimeout: 20000 })

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
})

async function renderBookedDays(options: Parameters<typeof scheduleApiStub>[0] = {}) {
    vi.stubEnv("VITE_API_URL", "http://api.test")
    vi.resetModules()
    const { default: createStore } = await import("@/store/createStore")
    const { default: useBookedDays } = await import("@/pages/hooks/useBookedDays")
    const api = scheduleApiStub(options)
    const store = createStore()

    function Wrapper({ children }: { children: ReactNode }) {
        return <Provider store={store}>{children}</Provider>
    }

    return { ...api, ...renderHook(() => useBookedDays(), { wrapper: Wrapper }) }
}

describe("useBookedDays", () => {
    it("começa sem dias e carrega os dias com agendamento", async () => {
        const { result } = await renderBookedDays({ bookedDays: buildBookedDays() })
        const initial = result.current.days

        await waitFor(() => expect(result.current.days).toEqual(buildBookedDays()))

        expect(initial).toEqual([])
        expect(result.current.failed).toBe(false)
    })

    it("avisa a falha e continua sem dias", async () => {
        const { result } = await renderBookedDays({
            handlers: {
                "GET /api/v1/schedule/booked-days": () => ({
                    status: 500,
                    body: { error: { code: "INTERNAL_ERROR", message: "x" } }
                })
            }
        })

        await waitFor(() => expect(result.current.failed).toBe(true))

        expect(result.current.days).toEqual([])
    })

    it("busca de novo ao pedir", async () => {
        const { result, callsTo } = await renderBookedDays({ bookedDays: buildBookedDays() })
        await waitFor(() => expect(result.current.days).toHaveLength(1))

        act(() => result.current.refetch())

        await waitFor(() => expect(callsTo("GET", "/api/v1/schedule/booked-days")).toHaveLength(2))
    })
})
