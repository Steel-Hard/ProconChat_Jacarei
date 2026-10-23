import { Provider } from "react-redux"
import { render } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { onTestFinished, vi } from "vitest"
import type PanelAccount from "@/types/account/PanelAccount.types"
import type UserAccountList from "@/types/users/UserAccountList.types"

type Reply = { status: number; body?: unknown }
type Handler = (request: { url: URL; body: unknown }) => Reply | Promise<Reply>
type Call = { method: string; url: URL; body: unknown }

type Options = {
    account?: PanelAccount
    list?: UserAccountList
    handlers?: Record<string, Handler>
}

const ADMIN: PanelAccount = {
    id: 1,
    name: "Ana Paula Souza",
    email: "ana@exemplo.gov.br",
    isAdmin: true,
    permissions: []
}

function respond({ status, body }: Reply): Response {
    return new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" }
    })
}

async function readCall(input: RequestInfo | URL, init?: RequestInit): Promise<Call> {
    if (input instanceof Request) {
        const text = await input.clone().text()

        return {
            method: input.method,
            url: new URL(input.url),
            body: text === "" ? undefined : JSON.parse(text)
        }
    }

    const raw = init?.body

    return {
        method: init?.method ?? "GET",
        url: new URL(String(input)),
        body: typeof raw === "string" ? JSON.parse(raw) : undefined
    }
}

async function importPageModules() {
    vi.stubEnv("VITE_API_URL", "http://api.test")
    vi.resetModules()
    const { default: createStore } = await import("@/store/createStore")
    const { default: ToastProvider } = await import("@/components/ToastProvider")
    const { default: UsersPage } = await import("@/pages/Users.page")

    return { createStore, ToastProvider, UsersPage }
}

let pageModules: ReturnType<typeof importPageModules> | undefined

async function renderUsersPage({ account = ADMIN, list, handlers = {} }: Options = {}) {
    pageModules ??= importPageModules()
    const { createStore, ToastProvider, UsersPage } = await pageModules
    const calls: Call[] = []
    let waiting = 0
    const replies: Record<string, Handler> = {
        "GET /api/v1/users": () => ({
            status: 200,
            body: { data: list ?? { items: [], lastChange: null } }
        }),
        ...handlers
    }
    vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const call = await readCall(input, init)
            calls.push(call)
            const handler = replies[`${call.method} ${call.url.pathname}`]

            if (!handler) {
                return respond({
                    status: 404,
                    body: { error: { code: "NOT_FOUND", message: "x" } }
                })
            }

            waiting += 1

            try {
                return respond(await handler({ url: call.url, body: call.body }))
            } finally {
                waiting -= 1
            }
        })
    )
    const store = createStore({ account: { current: account, status: "authenticated" } })
    const user = userEvent.setup()

    function inFlight(): number {
        const { queries, mutations } = store.getState().api

        return [...Object.values(queries), ...Object.values(mutations)].filter(
            (entry) => entry?.status === "pending"
        ).length
    }

    onTestFinished(async () => {
        await vi.waitFor(() => {
            if (inFlight() > waiting) {
                throw new Error("ainda há requisições em andamento")
            }
        })
    })

    render(
        <Provider store={store}>
            <ToastProvider>
                <UsersPage />
            </ToastProvider>
        </Provider>
    )

    function callsTo(method: string, pathname: string): Call[] {
        return calls.filter((call) => call.method === method && call.url.pathname === pathname)
    }

    return { calls, callsTo, store, user }
}

export default renderUsersPage
