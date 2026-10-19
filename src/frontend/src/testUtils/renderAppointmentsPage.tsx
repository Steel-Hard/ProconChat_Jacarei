import { Provider } from "react-redux"
import { render } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createBrowserRouter, createMemoryRouter, RouterProvider } from "react-router-dom"
import { vi } from "vitest"
import buildAppointmentList from "@/testUtils/buildAppointmentList"
import type PanelAccount from "@/types/account/PanelAccount.types"

type Reply = { status: number; body?: unknown }
type Handler = (request: { url: URL; body: unknown }) => Reply | Promise<Reply>
type Call = { method: string; url: URL; body: unknown }

type Options = {
    account?: PanelAccount
    initialEntry?: string
    handlers?: Record<string, Handler>
    browser?: boolean
}

const ADMIN: PanelAccount = {
    id: 1,
    name: "Ana Paula Souza",
    email: "ana@exemplo.gov.br",
    isAdmin: true,
    permissions: []
}

const LIST_PATH = "/api/v1/appointments"
const DETAIL_HEADING = "Detalhe do agendamento"

function respond({ status, body }: Reply): Response {
    return new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" }
    })
}

async function renderAppointmentsPage({
    account = ADMIN,
    initialEntry = "/agendamentos",
    handlers = {},
    browser = false
}: Options = {}) {
    vi.stubEnv("VITE_API_URL", "http://api.test")
    vi.resetModules()
    const calls: Call[] = []
    const replies: Record<string, Handler> = {
        [`GET ${LIST_PATH}`]: () => ({ status: 200, body: { data: buildAppointmentList([]) } }),
        [`GET ${LIST_PATH}/pending-count`]: () => ({ status: 200, body: { data: { count: 0 } } }),
        ...handlers
    }
    vi.stubGlobal(
        "fetch",
        vi.fn(async (input: Request) => {
            const url = new URL(input.url)
            const text = await input.text()
            const body = text === "" ? undefined : JSON.parse(text)
            calls.push({ method: input.method, url, body })
            const handler = replies[`${input.method} ${url.pathname}`]

            if (!handler) {
                return respond({
                    status: 404,
                    body: { error: { code: "NOT_FOUND", message: "x" } }
                })
            }

            return respond(await handler({ url, body }))
        })
    )
    const { default: createStore } = await import("@/store/createStore")
    const { default: ToastProvider } = await import("@/components/ToastProvider")
    const { default: AppointmentsPage } = await import("@/pages/Appointments.page")
    const store = createStore({ account: { current: account, status: "authenticated" } })
    const routes = [
        { path: "/agendamentos", element: <AppointmentsPage /> },
        { path: "/agendamentos/:id", element: <h1>{DETAIL_HEADING}</h1> }
    ]

    if (browser) {
        window.history.replaceState(null, "", initialEntry)
    }

    const router = browser
        ? createBrowserRouter(routes)
        : createMemoryRouter(routes, { initialEntries: [initialEntry] })
    const user = userEvent.setup()

    render(
        <Provider store={store}>
            <ToastProvider>
                <RouterProvider router={router} />
            </ToastProvider>
        </Provider>
    )

    function listRequests(): URLSearchParams[] {
        return calls
            .filter((call) => call.method === "GET" && call.url.pathname === LIST_PATH)
            .map((call) => call.url.searchParams)
    }

    function lastListRequest(): string {
        const requests = listRequests()

        return requests.at(-1)?.toString() ?? ""
    }

    return { calls, store, router, user, listRequests, lastListRequest }
}

export default renderAppointmentsPage
