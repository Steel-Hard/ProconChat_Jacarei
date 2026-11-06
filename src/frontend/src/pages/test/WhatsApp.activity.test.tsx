import { Provider } from "react-redux"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import type WhatsAppSettings from "@/types/whatsapp/WhatsAppSettings.types"

vi.setConfig({ testTimeout: 20000 })

const NEW_TOKEN = "EAAG-token-novo-ficticio-77Zz"
const UNKNOWN_LIFETIME = { kind: "UNKNOWN", expiresAt: null } as const
const FAILURES_PATH = "/api/v1/whatsapp/settings/delivery-failures"
const HISTORY_PATH = "/api/v1/whatsapp/settings/history"
const PRIVACY_PATH = "/api/v1/whatsapp/settings/privacy"
const REPLACE_HINT =
    'Gere um token permanente, use "Substituir", teste a conexão e salve as credenciais.'
const FAILURES_REGION = "Falhas de entrega nas últimas 24 horas"
const HISTORY_REGION = "Histórico de alterações"
const STATUS_REGION = "Estado do número"
const SERVER_ERROR = {
    status: 500,
    body: { error: { code: "INTERNAL_SERVER_ERROR", message: "x" } }
}

function settingsView(overrides: Partial<WhatsAppSettings> = {}): WhatsAppSettings {
    return {
        phoneNumberId: "100000000000001",
        businessAccountId: "200000000000002",
        accessToken: { configured: true, last4: "a91F" },
        appSecret: { configured: true, last4: "9c2e" },
        verifyToken: "3f9a".repeat(16),
        webhookUrl: "https://exemplo.sslip.io/webhooks/whatsapp",
        graphApiVersion: "v26.0",
        credentialsValid: true,
        credentialsCheckedAt: "2026-10-14T13:00:00.000Z",
        credentialsStatus: "VALID",
        webhook: { lastEventAt: "2026-10-14T13:00:00.000Z", stale: false },
        autoReplyPaused: false,
        pausedMessage: "Mensagem fixa de pausa",
        updatedBy: { id: 1, name: "Ana Paula" },
        updatedAt: "2026-10-14T13:00:00.000Z",
        displayPhoneNumber: "+55 12 3955-9000",
        verifiedName: "PROCON Jacareí",
        accessTokenLifetime: UNKNOWN_LIFETIME,
        ...overrides
    }
}

function privacyView() {
    return {
        controllerName: "Prefeitura de Jacareí",
        dpoName: "Maria Encarregada",
        contactEmail: "privacidade@exemplo.test",
        inPersonContact: null,
        retentionText: "Sessões por 12 meses.",
        retentionEnabled: false,
        sessionRetentionDays: 90,
        appointmentRetentionDays: 365,
        updatedBy: { id: 2, name: "Bruno Lima" },
        updatedAt: "2026-10-20T15:00:00.000Z"
    }
}

type Reply = { status: number; body?: unknown }
type Handler = (body: unknown) => Reply | Promise<Reply>
type Call = { method: string; path: string; body: unknown }

const OK_TEST: Handler = () => ({
    status: 200,
    body: {
        data: {
            ok: true,
            displayPhoneNumber: "+55 12 3955-9000",
            verifiedName: "PROCON Jacareí",
            checkedAt: "2026-10-15T10:00:00.000Z",
            accessTokenLifetime: UNKNOWN_LIFETIME
        }
    }
})

function pending(): Promise<Reply> {
    return new Promise<Reply>(() => {})
}

function failuresReply(items: unknown[], count = items.length): Handler {
    return () => ({
        status: 200,
        body: { data: { since: "2026-11-03T00:00:00.000Z", count, items } }
    })
}

function historyReply(items: unknown[]): Handler {
    return () => ({ status: 200, body: { data: { items } } })
}

function failure(overrides: Record<string, unknown> = {}) {
    return {
        id: "failure-1",
        kind: "REMINDER",
        errorCode: "131047",
        failedAt: "2026-11-03T15:00:00.000Z",
        appointmentId: "42",
        ...overrides
    }
}

function historyItem(overrides: Record<string, unknown> = {}) {
    return {
        id: "history-1",
        action: "credentials_saved",
        fields: ["accessToken"],
        actor: { id: 2, name: "Bruno Lima" },
        createdAt: "2026-11-02T18:30:00.000Z",
        ...overrides
    }
}

function respond(status: number, body?: unknown): Response {
    return new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" }
    })
}

function stubApi(handlers: Record<string, Handler>) {
    const calls: Call[] = []
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = input instanceof Request ? input : null
        const url = request ? request.url : String(input)
        const method = request ? request.method : (init?.method ?? "GET")
        const path = new URL(url, "http://localhost").pathname
        const rawBody = request ? null : init?.body
        const body = typeof rawBody === "string" ? JSON.parse(rawBody) : undefined
        calls.push({ method, path, body })
        const handler = handlers[`${method} ${path}`]

        if (!handler) {
            return respond(404, { error: { code: "NOT_FOUND", message: "x" } })
        }

        const reply = await handler(body)

        return respond(reply.status, reply.body)
    })
    vi.stubGlobal("fetch", fetchMock)

    return calls
}

async function renderPage(handlers: Record<string, Handler> = {}, view = settingsView()) {
    vi.stubEnv("VITE_API_URL", "http://api.test")
    vi.resetModules()
    const calls = stubApi({
        "GET /api/v1/whatsapp/settings": () => ({ status: 200, body: { data: view } }),
        [`GET ${FAILURES_PATH}`]: failuresReply([], 0),
        [`GET ${HISTORY_PATH}`]: historyReply([]),
        ...handlers
    })
    const { default: createStore } = await import("@/store/createStore")
    const { default: ToastProvider } = await import("@/components/ToastProvider")
    const { default: WhatsAppPage } = await import("@/pages/WhatsApp.page")
    const user = userEvent.setup()

    render(
        <Provider store={createStore()}>
            <ToastProvider>
                <WhatsAppPage />
            </ToastProvider>
        </Provider>
    )

    return { calls, user }
}

async function loaded() {
    await screen.findByRole("heading", { name: "Credenciais" })
}

function callsTo(calls: Call[], method: string, path: string): Call[] {
    return calls.filter((call) => call.method === method && call.path === path)
}

function region(name: string): HTMLElement {
    return screen.getByRole("region", { name })
}

async function pause(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("switch", { name: "Pausar respostas automáticas" }))
    await user.click(screen.getByRole("button", { name: "Pausar respostas" }))
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("WhatsAppPage, estado do número, falhas e histórico", () => {
    it("mostra só Válidas quando as credenciais válidas não têm data de verificação", async () => {
        await renderPage(
            {},
            settingsView({ credentialsStatus: "VALID", credentialsCheckedAt: null })
        )
        await loaded()

        expect(within(region(STATUS_REGION)).getByText("Válidas")).toBeInTheDocument()
        expect(within(region(STATUS_REGION)).queryByText(/verificadas em/)).not.toBeInTheDocument()
    })

    it("mostra a data e a hora da verificação depois de Válidas", async () => {
        await renderPage(
            {},
            settingsView({
                credentialsStatus: "VALID",
                credentialsCheckedAt: "2026-10-14T13:00:00.000Z"
            })
        )
        await loaded()

        expect(
            within(region(STATUS_REGION)).getByText("Válidas · verificadas em 14/10/2026 às 10:00")
        ).toBeInTheDocument()
    })

    it("mostra Ainda não verificadas sem a dica de substituir o token", async () => {
        await renderPage({}, settingsView({ credentialsStatus: "NOT_CHECKED" }))
        await loaded()

        expect(within(region(STATUS_REGION)).getByText("Ainda não verificadas")).toBeInTheDocument()
        expect(within(region(STATUS_REGION)).queryByText(REPLACE_HINT)).not.toBeInTheDocument()
    })

    it("mostra Token inválido ou expirado com a dica de substituir quando as credenciais são inválidas", async () => {
        await renderPage({}, settingsView({ credentialsStatus: "INVALID" }))
        await loaded()

        expect(
            within(region(STATUS_REGION)).getByText("Token inválido ou expirado")
        ).toBeInTheDocument()
        expect(within(region(STATUS_REGION)).getByText(REPLACE_HINT)).toBeInTheDocument()
    })

    it("mostra a bolinha decorativa ao lado de Válidas", async () => {
        await renderPage(
            {},
            settingsView({ credentialsStatus: "VALID", credentialsCheckedAt: null })
        )
        await loaded()

        expect(
            within(region(STATUS_REGION)).getByText("Válidas").querySelector('[aria-hidden="true"]')
        ).not.toBeNull()
    })

    it("mostra a bolinha decorativa ao lado de Token inválido ou expirado", async () => {
        await renderPage({}, settingsView({ credentialsStatus: "EXPIRED" }))
        await loaded()

        expect(
            within(region(STATUS_REGION))
                .getByText("Token inválido ou expirado")
                .querySelector('[aria-hidden="true"]')
        ).not.toBeNull()
    })

    it("não mostra bolinha ao lado de Ainda não verificadas", async () => {
        await renderPage({}, settingsView({ credentialsStatus: "NOT_CHECKED" }))
        await loaded()

        expect(
            within(region(STATUS_REGION))
                .getByText("Ainda não verificadas")
                .querySelector('[aria-hidden="true"]')
        ).toBeNull()
    })

    it("mostra Nenhum evento recebido quando a data do último evento do webhook não é data", async () => {
        await renderPage({}, settingsView({ webhook: { lastEventAt: "nao-e-data", stale: false } }))
        await loaded()

        expect(
            within(region(STATUS_REGION)).getByText("Nenhum evento recebido")
        ).toBeInTheDocument()
    })

    it("mostra Carregando nas falhas enquanto a leitura não responde", async () => {
        await renderPage({ [`GET ${FAILURES_PATH}`]: pending })
        await loaded()

        expect(within(region(FAILURES_REGION)).getByText("Carregando...")).toBeInTheDocument()
    })

    it("mostra o alerta de erro nas falhas quando a leitura falha", async () => {
        await renderPage({ [`GET ${FAILURES_PATH}`]: () => SERVER_ERROR })
        await loaded()

        expect(await within(region(FAILURES_REGION)).findByRole("alert")).toHaveTextContent(
            "Não foi possível carregar as falhas de entrega."
        )
    })

    it("mostra Nenhuma falha e o aviso de lista vazia quando não há falhas", async () => {
        await renderPage({ [`GET ${FAILURES_PATH}`]: failuresReply([], 0) })
        await loaded()

        expect(
            await within(region(FAILURES_REGION)).findByText("Nenhuma falha")
        ).toBeInTheDocument()
        expect(
            within(region(FAILURES_REGION)).getByText(
                "Nenhuma falha de entrega nas últimas 24 horas."
            )
        ).toBeInTheDocument()
    })

    it("mostra a falha de confirmação sem código de erro e sem agendamento", async () => {
        await renderPage({
            [`GET ${FAILURES_PATH}`]: failuresReply([
                failure({ kind: "CONFIRMATION", errorCode: null, appointmentId: null })
            ])
        })
        await loaded()

        expect(await within(region(FAILURES_REGION)).findByText("Confirmação")).toBeInTheDocument()
        expect(
            within(region(FAILURES_REGION)).queryByText(/Código de erro:/)
        ).not.toBeInTheDocument()
        expect(within(region(FAILURES_REGION)).queryByText(/Agendamento #/)).not.toBeInTheDocument()
    })

    it("mostra Data indisponível quando a data da falha não é data", async () => {
        await renderPage({
            [`GET ${FAILURES_PATH}`]: failuresReply([failure({ failedAt: "nao-e-data" })])
        })
        await loaded()

        expect(
            await within(region(FAILURES_REGION)).findByText("Data indisponível")
        ).toBeInTheDocument()
    })

    it("mostra a data e a hora de Brasília da falha num time com a data original", async () => {
        await renderPage({
            [`GET ${FAILURES_PATH}`]: failuresReply([
                failure({ failedAt: "2026-11-03T15:00:00.000Z" })
            ])
        })
        await loaded()

        expect(
            await within(region(FAILURES_REGION)).findByText("03/11/2026 às 12:00")
        ).toHaveAttribute("dateTime", "2026-11-03T15:00:00.000Z")
    })

    it("mostra Carregando no histórico enquanto a leitura não responde", async () => {
        await renderPage({ [`GET ${HISTORY_PATH}`]: pending })
        await loaded()

        expect(within(region(HISTORY_REGION)).getByText("Carregando...")).toBeInTheDocument()
    })

    it("mostra o alerta de erro no histórico quando a leitura falha", async () => {
        await renderPage({ [`GET ${HISTORY_PATH}`]: () => SERVER_ERROR })
        await loaded()

        expect(await within(region(HISTORY_REGION)).findByRole("alert")).toHaveTextContent(
            "Não foi possível carregar o histórico de alterações."
        )
    })

    it("mostra Nenhuma alteração registrada quando o histórico está vazio", async () => {
        await renderPage({ [`GET ${HISTORY_PATH}`]: historyReply([]) })
        await loaded()

        expect(
            await within(region(HISTORY_REGION)).findByText("Nenhuma alteração registrada.")
        ).toBeInTheDocument()
    })

    it("mostra Configuração atualizada para uma ação desconhecida", async () => {
        await renderPage({
            [`GET ${HISTORY_PATH}`]: historyReply([historyItem({ action: "acao_desconhecida" })])
        })
        await loaded()

        expect(
            await within(region(HISTORY_REGION)).findByText("Configuração atualizada")
        ).toBeInTheDocument()
    })

    it("mostra Usuário não identificado quando a alteração não tem autor", async () => {
        await renderPage({ [`GET ${HISTORY_PATH}`]: historyReply([historyItem({ actor: null })]) })
        await loaded()

        expect(
            await within(region(HISTORY_REGION)).findByText("Usuário não identificado")
        ).toBeInTheDocument()
    })

    it("descarta os campos desconhecidos da lista de campos alterados", async () => {
        await renderPage({
            [`GET ${HISTORY_PATH}`]: historyReply([
                historyItem({ fields: ["phoneNumberId", "campoDesconhecido"] })
            ])
        })
        await loaded()

        expect(
            await within(region(HISTORY_REGION)).findByText(
                "Campos alterados: ID do número de telefone"
            )
        ).toBeInTheDocument()
    })

    it("não mostra Campos alterados quando a alteração não tem campos", async () => {
        await renderPage({ [`GET ${HISTORY_PATH}`]: historyReply([historyItem({ fields: [] })]) })
        await loaded()

        await within(region(HISTORY_REGION)).findByText("Credenciais atualizadas")

        expect(
            within(region(HISTORY_REGION)).queryByText(/Campos alterados/)
        ).not.toBeInTheDocument()
    })

    it("mostra a data e a hora de Brasília da alteração num time com a data original", async () => {
        await renderPage({
            [`GET ${HISTORY_PATH}`]: historyReply([
                historyItem({ createdAt: "2026-11-02T18:30:00.000Z" })
            ])
        })
        await loaded()

        expect(
            await within(region(HISTORY_REGION)).findByText("02/11/2026 às 15:30")
        ).toHaveAttribute("dateTime", "2026-11-02T18:30:00.000Z")
    })

    it("não pede falhas nem histórico quando a leitura da configuração falha", async () => {
        const { calls } = await renderPage({ "GET /api/v1/whatsapp/settings": () => SERVER_ERROR })

        expect(
            await screen.findByText(
                "Não foi possível carregar a configuração do WhatsApp agora. Tente de novo."
            )
        ).toBeInTheDocument()
        expect(callsTo(calls, "GET", FAILURES_PATH)).toHaveLength(0)
        expect(callsTo(calls, "GET", HISTORY_PATH)).toHaveLength(0)
    })

    it("mostra o erro do histórico quando a nova leitura depois da pausa falha", async () => {
        let historyReads = 0
        const { user } = await renderPage({
            "POST /api/v1/whatsapp/settings/pause": () => ({
                status: 200,
                body: { data: settingsView({ autoReplyPaused: true }) }
            }),
            [`GET ${HISTORY_PATH}`]: () => {
                historyReads += 1

                return historyReads === 1
                    ? { status: 200, body: { data: { items: [] } } }
                    : SERVER_ERROR
            }
        })
        await loaded()
        await within(region(HISTORY_REGION)).findByText("Nenhuma alteração registrada.")

        await pause(user)

        expect(
            await within(region(HISTORY_REGION)).findByText(
                "Não foi possível carregar o histórico de alterações."
            )
        ).toBeInTheDocument()
    })

    it("não pede o histórico de novo quando a pausa falha", async () => {
        const { user, calls } = await renderPage({
            "POST /api/v1/whatsapp/settings/pause": () => SERVER_ERROR
        })
        await loaded()
        await within(region(HISTORY_REGION)).findByText("Nenhuma alteração registrada.")

        await pause(user)

        expect(
            await screen.findByText("Não foi possível pausar agora. Tente de novo.")
        ).toBeInTheDocument()
        expect(callsTo(calls, "GET", HISTORY_PATH)).toHaveLength(1)
    })

    it("não pede o histórico de novo quando salvar as credenciais falha", async () => {
        const { user, calls } = await renderPage({
            "POST /api/v1/whatsapp/settings/test": OK_TEST,
            "PUT /api/v1/whatsapp/settings": () => SERVER_ERROR
        })
        await loaded()
        await within(region(HISTORY_REGION)).findByText("Nenhuma alteração registrada.")
        await user.click(
            within(screen.getByRole("group", { name: "Token de acesso" })).getByRole("button", {
                name: "Substituir"
            })
        )
        await user.type(screen.getByLabelText("Token de acesso", { selector: "input" }), NEW_TOKEN)
        await user.click(screen.getByRole("button", { name: "Testar conexão" }))
        await screen.findByText("Conexão testada com sucesso.")

        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

        expect(
            await screen.findByText("Não foi possível salvar agora. Tente de novo.")
        ).toBeInTheDocument()
        expect(callsTo(calls, "GET", HISTORY_PATH)).toHaveLength(1)
    })

    it("não pede falhas nem histórico de novo ao ir para Privacidade e voltar para Conexão", async () => {
        const { user, calls } = await renderPage({
            [`GET ${PRIVACY_PATH}`]: () => ({ status: 200, body: { data: privacyView() } })
        })
        await loaded()
        await within(region(HISTORY_REGION)).findByText("Nenhuma alteração registrada.")
        await within(region(FAILURES_REGION)).findByText("Nenhuma falha")
        await user.click(screen.getByRole("tab", { name: "Privacidade" }))
        await screen.findByLabelText("Nome do controlador")

        await user.click(screen.getByRole("tab", { name: "Conexão" }))

        await waitFor(() =>
            expect(
                within(region(HISTORY_REGION)).getByText("Nenhuma alteração registrada.")
            ).toBeInTheDocument()
        )
        expect(callsTo(calls, "GET", FAILURES_PATH)).toHaveLength(1)
        expect(callsTo(calls, "GET", HISTORY_PATH)).toHaveLength(1)
    })
})
