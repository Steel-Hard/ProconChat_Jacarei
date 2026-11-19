import { Provider } from "react-redux"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { onTestFinished, vi } from "vitest"
import buildSessionDetail from "@/testUtils/buildSessionDetail"
import buildSessionList from "@/testUtils/buildSessionList"
import type PanelAccount from "@/types/account/PanelAccount.types"
import type { SessionDetail, SessionList } from "@/types/sessions/Session.types"

type Reply = { status: number; body: unknown }
type Handler = (url: URL) => Reply | Promise<Reply> | null
type Call = { url: URL; method: string }

type Options = {
    handler?: Handler
    account?: PanelAccount
    list?: SessionList
    details?: Record<string, SessionDetail>
    initialUrl?: string
}

const ADMIN: PanelAccount = {
    id: 1,
    name: "Ana Paula Souza",
    email: "ana@exemplo.gov.br",
    isAdmin: true,
    permissions: []
}

const APPOINTMENT_HEADING = "Tela do agendamento"

async function loaded() {
    await screen.findByRole("table", { name: "Sessões" })
}

async function renderSessionsPage({
    handler,
    account = ADMIN,
    list,
    details,
    initialUrl = "/sessoes"
}: Options = {}) {
    vi.stubEnv("VITE_API_URL", "http://api.test")
    vi.resetModules()
    const calls: Call[] = []
    const detailMap = details ?? { "S-A1B2C3D4": buildSessionDetail() }
    const reply: Handler = (url) => {
        const custom = handler?.(url)

        if (custom) {
            return custom
        }

        if (url.pathname === "/api/v1/sessions") {
            return { status: 200, body: { data: list ?? buildSessionList() } }
        }

        const code = decodeURIComponent(url.pathname.split("/").pop() ?? "")
        const detail = detailMap[code]

        return detail
            ? { status: 200, body: { data: detail } }
            : { status: 404, body: { error: "not found" } }
    }

    vi.stubGlobal(
        "fetch",
        vi.fn(async (input: Request) => {
            const url = new URL(input.url)
            calls.push({ url, method: input.method })
            const result = await reply(url)

            return new Response(JSON.stringify(result?.body), {
                status: result?.status ?? 500,
                headers: { "Content-Type": "application/json" }
            })
        })
    )
    const { default: createStore } = await import("@/store/createStore")
    const { default: SessionsPage } = await import("@/pages/Sessions.page")
    const store = createStore({ account: { current: account, status: "authenticated" } })
    const router = createMemoryRouter(
        [
            { path: "/sessoes", element: <SessionsPage /> },
            { path: "/agendamentos/:id", element: <h1>{APPOINTMENT_HEADING}</h1> }
        ],
        { initialEntries: [initialUrl] }
    )
    const user = userEvent.setup()

    onTestFinished(async () => {
        await vi.waitFor(() => {
            const { queries } = store.getState().api

            if (Object.values(queries).some((entry) => entry?.status === "pending")) {
                throw new Error("ainda há requisições em andamento")
            }
        })
    })

    render(
        <Provider store={store}>
            <RouterProvider router={router} />
        </Provider>
    )

    function listRequests(): Call[] {
        return calls.filter((call) => call.url.pathname === "/api/v1/sessions")
    }

    return { calls, store, router, user, listRequests, loaded }
}

export { APPOINTMENT_HEADING }
export default renderSessionsPage
