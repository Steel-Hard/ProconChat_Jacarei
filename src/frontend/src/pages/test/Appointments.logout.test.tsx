import { act, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import buildAppointmentList from "@/testUtils/buildAppointmentList"
import buildAppointmentListItem from "@/testUtils/buildAppointmentListItem"
import loadPanelRoutes from "@/testUtils/loadPanelRoutes"
import type PanelAccount from "@/types/account/PanelAccount.types"

vi.setConfig({ testTimeout: 20000 })

const FICTITIOUS_CPF = "11122233344"

const admin: PanelAccount = {
    id: 1,
    name: "Ana Paula Souza",
    email: "ana@exemplo.gov.br",
    isAdmin: true,
    permissions: []
}

type Call = { method: string; url: URL }

let panel: Awaited<ReturnType<typeof loadPanelRoutes>>
let unauthorized: () => (() => void) | null

function json(status: number, body?: unknown): Response {
    return new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" }
    })
}

function stubApi(): Call[] {
    const calls: Call[] = []
    vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const request = input instanceof Request ? input : null
            const url = new URL(request ? request.url : String(input))
            const method = request ? request.method : (init?.method ?? "GET")
            calls.push({ method, url })

            if (url.pathname === "/api/v1/auth/logout") {
                return new Response(null, { status: 204 })
            }

            if (url.pathname === "/api/v1/appointments/pending-count") {
                return json(200, { data: { count: 0 } })
            }

            if (url.pathname === "/api/v1/appointments") {
                return json(200, {
                    data: buildAppointmentList([buildAppointmentListItem()])
                })
            }

            return json(404, { error: { code: "NOT_FOUND", message: "x" } })
        })
    )

    return calls
}

async function openListWithCpfSearch() {
    const calls = stubApi()
    const router = createMemoryRouter(panel.routes, { initialEntries: ["/agendamentos"] })
    const { store } = panel.renderWithStore(<RouterProvider router={router} />, {
        preloadedState: { account: { current: admin, status: "authenticated" } }
    })
    const user = userEvent.setup()
    await user.type(await screen.findByRole("searchbox", { name: "Buscar" }), FICTITIOUS_CPF)
    expect(await screen.findByText(/1 resultado/)).toBeInTheDocument()
    expect(JSON.stringify(Object.keys(store.getState().api.queries))).toContain(FICTITIOUS_CPF)

    return { calls, store, user }
}

function searchRequestsAfter(calls: Call[], index: number): Call[] {
    return calls.slice(index).filter((call) => call.url.searchParams.has("search"))
}

describe("Appointments.page: sair com a lista aberta", () => {
    beforeAll(async () => {
        panel = await loadPanelRoutes([
            () => import("@/pages/Appointments.page"),
            () => import("@/pages/Login.page")
        ])
        const { default: authHandlers } = await import("@/services/http/authHandlers")
        unauthorized = () => authHandlers.unauthorizedHandler
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    afterAll(() => {
        vi.unstubAllEnvs()
    })

    it("Sair apaga a busca por CPF do cache e não busca de novo", async () => {
        const { calls, store, user } = await openListWithCpfSearch()
        const before = calls.length

        await user.click(screen.getByRole("button", { name: "Minha conta" }))
        await user.click(screen.getByRole("button", { name: "Sair" }))

        expect(await screen.findByRole("heading", { name: "Entrar" })).toBeInTheDocument()
        await waitFor(() =>
            expect(calls.some((call) => call.url.pathname === "/api/v1/auth/logout")).toBe(true)
        )
        expect(
            Object.keys(store.getState().api.queries).some((key) => key.includes(FICTITIOUS_CPF))
        ).toBe(false)
        expect(JSON.stringify(store.getState())).not.toContain(FICTITIOUS_CPF)
        expect(searchRequestsAfter(calls, before)).toEqual([])
    })

    it("a sessão expirada apaga a busca por CPF do cache e não busca de novo", async () => {
        const { calls, store } = await openListWithCpfSearch()
        const before = calls.length

        act(() => unauthorized()?.())

        expect(await screen.findByRole("heading", { name: "Entrar" })).toBeInTheDocument()
        expect(
            Object.keys(store.getState().api.queries).some((key) => key.includes(FICTITIOUS_CPF))
        ).toBe(false)
        expect(JSON.stringify(store.getState())).not.toContain(FICTITIOUS_CPF)
        expect(searchRequestsAfter(calls, before)).toEqual([])
    })
})
