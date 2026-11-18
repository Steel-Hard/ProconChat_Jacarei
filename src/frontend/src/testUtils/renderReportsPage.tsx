import { Provider } from "react-redux"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { onTestFinished, vi } from "vitest"
import buildReportsSummary from "@/testUtils/buildReportsSummary"
import type PanelAccount from "@/types/account/PanelAccount.types"
import type ReportsSummary from "@/types/reports/ReportsSummary.types"

type Reply = { status: number; body: unknown }
type Handler = (url: URL) => Reply | Promise<Reply>
type Call = { url: URL; method: string }

type Options = {
    handler?: Handler
    account?: PanelAccount
    summary?: ReportsSummary
}

const ADMIN: PanelAccount = {
    id: 1,
    name: "Ana Paula Souza",
    email: "ana@exemplo.gov.br",
    isAdmin: true,
    permissions: []
}

const SCHEDULE_HEADING = "Tela de horários"

async function loaded() {
    await screen.findByRole("heading", { level: 2, name: "Desfecho das conversas" })
}

async function renderReportsPage({ handler, account = ADMIN, summary }: Options = {}) {
    vi.stubEnv("VITE_API_URL", "http://api.test")
    vi.resetModules()
    const calls: Call[] = []
    const reply: Handler =
        handler ??
        (() => ({
            status: 200,
            body: { data: summary ?? buildReportsSummary() }
        }))
    vi.stubGlobal(
        "fetch",
        vi.fn(async (input: Request) => {
            const url = new URL(input.url)
            calls.push({ url, method: input.method })
            const result = await reply(url)

            return new Response(JSON.stringify(result.body), {
                status: result.status,
                headers: { "Content-Type": "application/json" }
            })
        })
    )
    const { default: createStore } = await import("@/store/createStore")
    const { default: ReportsPage } = await import("@/pages/Reports.page")
    const store = createStore({ account: { current: account, status: "authenticated" } })
    const router = createMemoryRouter(
        [
            { path: "/relatorios", element: <ReportsPage /> },
            { path: "/horarios", element: <h1>{SCHEDULE_HEADING}</h1> }
        ],
        { initialEntries: ["/relatorios"] }
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

    function requests(): Call[] {
        return calls.filter((call) => call.url.pathname === "/api/v1/reports")
    }

    return { calls, store, router, user, requests, loaded }
}

export default renderReportsPage
