import type { ReactNode } from "react"
import { Provider } from "react-redux"
import { renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type PanelAccount from "@/types/account/PanelAccount.types"

const admin: PanelAccount = {
    id: 1,
    name: "Ana Paula Souza",
    email: "ana@exemplo.gov.br",
    isAdmin: true,
    permissions: []
}

const staffWithoutAppointments: PanelAccount = {
    ...admin,
    id: 2,
    isAdmin: false,
    permissions: ["sessions.view", "reports.view"]
}

const staffWhoViews: PanelAccount = {
    ...admin,
    id: 3,
    isAdmin: false,
    permissions: ["appointments.view"]
}

function respond(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" }
    })
}

async function renderBadges(account: PanelAccount | null, reply: () => Response) {
    vi.stubEnv("VITE_API_URL", "http://api.test")
    vi.resetModules()
    const fetchMock = vi.fn(async () => reply())
    vi.stubGlobal("fetch", fetchMock)
    const { default: createStore } = await import("@/store/createStore")
    const { default: useNavBadges } = await import("@/hooks/useNavBadges")
    const store = createStore({
        account: { current: account, status: account ? "authenticated" : "anonymous" }
    })

    function Wrapper({ children }: { children: ReactNode }) {
        return <Provider store={store}>{children}</Provider>
    }

    const hook = renderHook(() => useNavBadges(), { wrapper: Wrapper })

    return { ...hook, fetchMock }
}

function countReply(count: number) {
    return () => respond(200, { data: { count } })
}

function requestedUrl(fetchMock: ReturnType<typeof vi.fn>, index: number): string {
    return (fetchMock.mock.calls[index][0] as Request).url
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("useNavBadges", () => {
    it("devolve o número de pendentes do Admin com o texto no plural", async () => {
        const { result, fetchMock } = await renderBadges(admin, countReply(3))

        await waitFor(() =>
            expect(result.current).toEqual({
                appointments: { count: 3, label: "agendamentos pendentes" }
            })
        )
        expect(requestedUrl(fetchMock, 0)).toBe("http://api.test/api/v1/appointments/pending-count")
    })

    it("usa o singular com um pendente", async () => {
        const { result } = await renderBadges(staffWhoViews, countReply(1))

        await waitFor(() =>
            expect(result.current).toEqual({
                appointments: { count: 1, label: "agendamento pendente" }
            })
        )
    })

    it("não mostra número quando não há pendentes", async () => {
        const { result, fetchMock } = await renderBadges(admin, countReply(0))

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
        await waitFor(() => expect(result.current).toEqual({}))
    })

    it("não mostra número quando a API recusa com 403", async () => {
        const { result, fetchMock } = await renderBadges(admin, () =>
            respond(403, { error: { code: "FORBIDDEN", message: "x" } })
        )

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
        expect(result.current).toEqual({})
    })

    it("não chama a API para a conta sem acesso a Agendamentos", async () => {
        const { result, fetchMock } = await renderBadges(staffWithoutAppointments, countReply(5))

        await new Promise((resolve) => setTimeout(resolve, 20))

        expect(fetchMock).not.toHaveBeenCalled()
        expect(result.current).toEqual({})
    })

    it("não chama a API sem conta", async () => {
        const { result, fetchMock } = await renderBadges(null, countReply(5))

        await new Promise((resolve) => setTimeout(resolve, 20))

        expect(fetchMock).not.toHaveBeenCalled()
        expect(result.current).toEqual({})
    })
})
