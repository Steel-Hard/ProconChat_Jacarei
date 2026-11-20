import { Provider } from "react-redux"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { vi } from "vitest"
import buildWhatsAppSettings from "@/testUtils/buildWhatsAppSettings"
import type WhatsAppSettings from "@/types/whatsapp/WhatsAppSettings.types"

type Reply = { status: number; body?: unknown }
type Handler = (body: unknown) => Reply | Promise<Reply>
type Call = { method: string; path: string; body: unknown }

const LAZY_LOAD_TIMEOUT = 10000

const APPROVED_TEMPLATES = {
    checkedAt: "2026-11-04T14:00:00.000Z",
    templates: [
        {
            kind: "CANCELLATION",
            name: "aviso_cancelamento",
            languageCode: "pt_BR",
            status: "APPROVED",
            metaStatus: "APPROVED"
        },
        {
            kind: "REMINDER",
            name: "lembrete_atendimento",
            languageCode: "pt_BR",
            status: "APPROVED",
            metaStatus: "APPROVED"
        }
    ]
}

function respond({ status, body }: Reply): Response {
    return new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" }
    })
}

async function renderWhatsAppPage(
    handlers: Record<string, Handler> = {},
    view: WhatsAppSettings = buildWhatsAppSettings()
) {
    vi.stubEnv("VITE_API_URL", "http://api.test")
    vi.resetModules()
    const calls: Call[] = []
    const replies: Record<string, Handler> = {
        "GET /api/v1/whatsapp/settings": () => ({ status: 200, body: { data: view } }),
        "GET /api/v1/whatsapp/settings/delivery-failures": () => ({
            status: 200,
            body: { data: { since: "2026-11-03T00:00:00.000Z", count: 0, items: [] } }
        }),
        "GET /api/v1/whatsapp/settings/history": () => ({
            status: 200,
            body: { data: { items: [] } }
        }),
        "GET /api/v1/whatsapp/settings/templates": () => ({
            status: 200,
            body: { data: APPROVED_TEMPLATES }
        }),
        "GET /api/v1/whatsapp/settings/number-status": () => ({
            status: 200,
            body: {
                data: {
                    checkedAt: "2026-11-04T14:00:00.000Z",
                    qualityRating: "HIGH",
                    messagingLimit: { tier: "TIER_250", dailyLimit: 250, usedLast24h: 50 }
                }
            }
        }),
        ...handlers
    }
    vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const request = input instanceof Request ? input : null
            const url = request ? request.url : String(input)
            const method = request ? request.method : (init?.method ?? "GET")
            const path = new URL(url, "http://localhost").pathname
            const text = request ? await request.text() : init?.body
            const body = typeof text === "string" && text !== "" ? JSON.parse(text) : undefined
            calls.push({ method, path, body })
            const handler = replies[`${method} ${path}`]

            if (!handler) {
                return respond({
                    status: 404,
                    body: { error: { code: "NOT_FOUND", message: "x" } }
                })
            }

            return respond(await handler(body))
        })
    )
    const { default: createStore } = await import("@/store/createStore")
    const { default: ToastProvider } = await import("@/components/ToastProvider")
    const { default: WhatsAppPage } = await import("@/pages/WhatsApp.page")
    const store = createStore()
    const user = userEvent.setup()

    render(
        <Provider store={store}>
            <ToastProvider>
                <WhatsAppPage />
            </ToastProvider>
        </Provider>
    )
    await screen.findByRole("heading", { name: "Credenciais" }, { timeout: LAZY_LOAD_TIMEOUT })

    function requests(method: string, path: string): Call[] {
        return calls.filter((call) => call.method === method && call.path === path)
    }

    return { calls, store, user, requests }
}

export default renderWhatsAppPage
