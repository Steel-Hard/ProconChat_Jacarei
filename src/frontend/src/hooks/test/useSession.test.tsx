import { afterEach, describe, expect, it, vi } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { Provider } from "react-redux"
import type RootState from "@/types/store/RootState.types"

const ME_URL = "http://api.test/api/v1/auth/me"
const REFRESH_URL = "http://api.test/api/v1/auth/refresh"

const user = {
    id: 1,
    name: "Ana Paula Souza",
    email: "ana@exemplo.gov.br",
    isAdmin: true,
    permissions: ["sessions.view"]
}

function jsonResponse(status: number, body?: unknown): Response {
    return new Response(body === undefined ? null : JSON.stringify(body), { status })
}

function stubFetch(responder: (url: string) => Response | Promise<Response>) {
    vi.stubEnv("VITE_API_URL", "http://api.test")
    const fetchMock = vi.fn((url: string) => Promise.resolve(responder(url)))
    vi.stubGlobal("fetch", fetchMock)
    return fetchMock
}

async function renderSession(preloadedState?: Partial<RootState>) {
    vi.resetModules()
    const { default: freshUseSession } = await import("@/hooks/useSession")
    const { default: freshCreateStore } = await import("@/store/createStore")
    const { default: freshAuthHandlers } = await import("@/services/http/authHandlers")
    const store = freshCreateStore(preloadedState)
    const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider store={store}>{children}</Provider>
    )
    const result = renderHook(() => freshUseSession(), { wrapper })

    const { default: freshAppointmentsApi } = await import("@/store/api/appointments.api")

    return {
        ...result,
        store,
        authHandlers: freshAuthHandlers,
        appointmentsApi: freshAppointmentsApi
    }
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("useSession", () => {
    it("chama /me uma vez e fica em unknown até a resposta", async () => {
        const response = Promise.withResolvers<Response>()
        const fetchMock = stubFetch(() => response.promise)

        const { result } = await renderSession()

        expect(result.current).toBe("unknown")
        expect(fetchMock).toHaveBeenCalledTimes(1)
        expect(fetchMock.mock.calls[0][0]).toBe(ME_URL)
        await act(async () => {
            response.resolve(jsonResponse(200, { data: user }))
        })
    })

    it("carrega a conta quando /me responde 200", async () => {
        stubFetch(() => jsonResponse(200, { data: user }))

        const { result, store } = await renderSession()

        await waitFor(() => expect(result.current).toBe("authenticated"))
        expect(store.getState().account.current).toEqual(user)
    })

    it("carrega a conta depois de renovar a sessão quando /me responde 401", async () => {
        let meCalls = 0
        const fetchMock = stubFetch((url) => {
            if (url === REFRESH_URL) {
                return jsonResponse(204)
            }
            meCalls += 1
            return meCalls === 1 ? jsonResponse(401) : jsonResponse(200, { data: user })
        })

        const { result, store } = await renderSession()

        await waitFor(() => expect(result.current).toBe("authenticated"))
        expect(store.getState().account.current?.id).toBe(1)
        expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([ME_URL, REFRESH_URL, ME_URL])
    })

    it("fica anônimo quando /me responde 401 e o refresh falha", async () => {
        stubFetch(() => jsonResponse(401))

        const { result, store } = await renderSession()

        await waitFor(() => expect(result.current).toBe("anonymous"))
        expect(store.getState().account.current).toBeNull()
    })

    it("fica anônimo quando /me falha por rede", async () => {
        vi.stubEnv("VITE_API_URL", "http://api.test")
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")))

        const { result } = await renderSession()

        await waitFor(() => expect(result.current).toBe("anonymous"))
    })

    it("ignora a resposta do /me depois de desmontar", async () => {
        const response = Promise.withResolvers<Response>()
        stubFetch(() => response.promise)
        const { unmount, store } = await renderSession()

        unmount()
        await act(async () => {
            response.resolve(jsonResponse(200, { data: user }))
        })

        expect(store.getState().account).toEqual({ current: null, status: "unknown" })
    })

    it("registra um onUnauthorized que limpa a conta e o remove ao desmontar", async () => {
        const fetchMock = stubFetch(() => jsonResponse(500))
        const {
            result,
            store,
            unmount,
            authHandlers: handlers
        } = await renderSession({
            account: { current: { ...user, permissions: [] }, status: "authenticated" }
        })

        act(() => handlers.unauthorizedHandler?.())

        expect(result.current).toBe("anonymous")
        expect(store.getState().account.current).toBeNull()
        expect(fetchMock).not.toHaveBeenCalled()
        unmount()
        expect(handlers.unauthorizedHandler).toBeNull()
    })
    it("limpa o cache da API quando a sessão expira", async () => {
        stubFetch(() => jsonResponse(500))
        const {
            store,
            authHandlers: handlers,
            appointmentsApi
        } = await renderSession({
            account: { current: { ...user, permissions: [] }, status: "authenticated" }
        })
        store.dispatch(
            appointmentsApi.util.upsertQueryEntries([
                { endpointName: "getPendingAppointmentsCount", arg: undefined, value: 3 }
            ])
        )
        expect(Object.keys(store.getState().api.queries)).toHaveLength(1)

        act(() => handlers.unauthorizedHandler?.())

        expect(store.getState().account.current).toBeNull()
        expect(Object.keys(store.getState().api.queries)).toHaveLength(0)
    })
})
