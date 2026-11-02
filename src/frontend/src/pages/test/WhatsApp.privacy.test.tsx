import { Provider } from "react-redux"
import { act, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import type PrivacySettings from "@/types/privacy/PrivacySettings.types"
import type WhatsAppSettings from "@/types/whatsapp/WhatsAppSettings.types"

vi.setConfig({ testTimeout: 20000 })

const PRIVACY_PATH = "/api/v1/whatsapp/settings/privacy"

const SETTINGS: WhatsAppSettings = {
    phoneNumberId: "100000000000001",
    businessAccountId: "200000000000002",
    accessToken: { configured: true, last4: "a91F" },
    appSecret: { configured: true, last4: "9c2e" },
    verifyToken: "3f9a".repeat(16),
    webhookUrl: "https://exemplo.sslip.io/webhooks/whatsapp",
    graphApiVersion: "v26.0",
    credentialsValid: true,
    credentialsCheckedAt: "2026-10-14T13:00:00.000Z",
    autoReplyPaused: false,
    pausedMessage: "Mensagem fixa",
    updatedBy: { id: 1, name: "Ana Paula" },
    updatedAt: "2026-10-14T13:00:00.000Z",
    displayPhoneNumber: "+55 12 3955-9000",
    verifiedName: "PROCON Jacareí",
    accessTokenLifetime: { kind: "UNKNOWN", expiresAt: null }
}

function privacyView(overrides: Partial<PrivacySettings> = {}): PrivacySettings {
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
        updatedAt: "2026-10-20T15:00:00.000Z",
        ...overrides
    }
}

type Reply = { status: number; body?: unknown }
type Handler = (body: unknown) => Reply | Promise<Reply>
type Call = { method: string; path: string; body: unknown }

function respond(status: number, body?: unknown): Response {
    return new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" }
    })
}

async function bodyOf(request: Request | null, init?: RequestInit): Promise<unknown> {
    const raw = request ? await request.clone().text() : init?.body
    return typeof raw === "string" && raw !== "" ? JSON.parse(raw) : undefined
}

function stubApi(handlers: Record<string, Handler>) {
    const calls: Call[] = []
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = input instanceof Request ? input : null
        const url = request ? request.url : String(input)
        const method = request ? request.method : (init?.method ?? "GET")
        const path = new URL(url, "http://localhost").pathname
        const body = await bodyOf(request, init)
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

async function renderPage(handlers: Record<string, Handler> = {}) {
    vi.stubEnv("VITE_API_URL", "http://api.test")
    vi.resetModules()
    const calls = stubApi({
        "GET /api/v1/whatsapp/settings": () => ({ status: 200, body: { data: SETTINGS } }),
        [`GET ${PRIVACY_PATH}`]: () => ({ status: 200, body: { data: privacyView() } }),
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

async function openPrivacy(user: ReturnType<typeof userEvent.setup>) {
    await user.click(await screen.findByRole("tab", { name: "Privacidade" }))
    await screen.findByLabelText("Nome do controlador")
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("WhatsAppPage, aba Privacidade", () => {
    it("abre na aba Conexão com as credenciais", async () => {
        await renderPage()

        const connection = await screen.findByRole("tab", { name: "Conexão" })
        expect(connection).toHaveAttribute("aria-selected", "true")
        expect(screen.getByRole("tab", { name: "Privacidade" })).toHaveAttribute(
            "aria-selected",
            "false"
        )
        expect(
            await within(screen.getByRole("tabpanel")).findByRole("heading", {
                name: "Credenciais"
            })
        ).toBeInTheDocument()
    })

    it("mostra o alerta e nenhum campo quando a leitura da privacidade falha", async () => {
        const { user } = await renderPage({
            [`GET ${PRIVACY_PATH}`]: () => ({
                status: 500,
                body: { error: { code: "X", message: "x" } }
            })
        })

        await user.click(await screen.findByRole("tab", { name: "Privacidade" }))

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Não foi possível carregar a configuração de privacidade."
        )
        expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
    })

    it("mostra os cinco campos com os rótulos e os valores da API, e o null vazio", async () => {
        const { user } = await renderPage()

        await openPrivacy(user)

        expect(screen.getByLabelText("Nome do controlador")).toHaveValue("Prefeitura de Jacareí")
        expect(screen.getByLabelText("Nome do encarregado (DPO)")).toHaveValue("Maria Encarregada")
        expect(screen.getByLabelText("E-mail de contato para pedidos do titular")).toHaveValue(
            "privacidade@exemplo.test"
        )
        expect(screen.getByLabelText("Atendimento presencial (opcional)")).toHaveValue("")
        expect(screen.getByLabelText("Prazos de guarda")).toHaveValue("Sessões por 12 meses.")
    })

    it.each([
        [
            "Nome do controlador",
            "Quem decide o que é feito com os dados pessoais dos cidadãos. Geralmente é o órgão, por exemplo PROCON Jacareí. Aparece na página pública de privacidade."
        ],
        [
            "Nome do encarregado (DPO)",
            "Pessoa indicada para atender os cidadãos e a ANPD sobre o tratamento de dados. A LGPD exige que o nome seja público. Aparece na página de privacidade."
        ],
        [
            "E-mail de contato para pedidos do titular",
            "E-mail onde o cidadão pede acesso, correção ou exclusão dos próprios dados. Aparece na página de privacidade e, junto com o nome do controlador, libera o link da política na saudação do bot."
        ],
        [
            "Atendimento presencial (opcional)",
            "Endereço ou telefone para quem prefere atendimento presencial. Se ficar em branco, essa linha não aparece na página."
        ],
        [
            "Prazos de guarda",
            "Texto livre com outros prazos que a página pública deve mostrar. A anonimização automática é configurada nos campos abaixo."
        ],
        [
            "Anonimização automática",
            "Quando ligada, o sistema remove a cada hora a ligação das conversas com o número e o nome e o CPF dos agendamentos que passaram do prazo. Não pode ser desfeito."
        ],
        [
            "Prazo das conversas (dias)",
            "Dias depois do fim da conversa. A conversa que gerou um agendamento espera o prazo do agendamento."
        ],
        ["Prazo dos agendamentos (dias)", "Dias depois da data do atendimento, em qualquer status."]
    ])("o campo %s tem um tooltip acessível pelo teclado com a explicação", async (field, hint) => {
        const { user } = await renderPage()
        await openPrivacy(user)
        const button = screen.getByRole("button", { name: `Sobre o campo ${field}` })

        act(() => button.focus())

        const tooltip = screen.getByRole("tooltip")
        expect(tooltip).toHaveTextContent(hint)
        expect(button).toHaveAttribute("aria-describedby", tooltip.id)
    })

    it("um e-mail sem formato válido mostra a mensagem e desabilita Salvar", async () => {
        const { user } = await renderPage()
        await openPrivacy(user)
        const email = screen.getByLabelText("E-mail de contato para pedidos do titular")

        await user.clear(email)
        await user.type(email, "sem-arroba")

        expect(screen.getByText("Informe um e-mail válido.")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeDisabled()
    })

    it("151 caracteres no controlador mostram o limite do campo", async () => {
        const { user } = await renderPage()
        await openPrivacy(user)
        const controller = screen.getByLabelText("Nome do controlador")

        await user.clear(controller)
        await user.click(controller)
        await user.paste("c".repeat(151))

        expect(screen.getByText("Use no máximo 150 caracteres.")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeDisabled()
    })

    it("alterar um campo mostra 1 alteração não salva e Descartar volta ao valor carregado", async () => {
        const { user } = await renderPage()
        await openPrivacy(user)
        const dpo = screen.getByLabelText("Nome do encarregado (DPO)")

        await user.type(dpo, " Silva")
        expect(screen.getByText("1 alteração não salva")).toBeInTheDocument()
        await user.click(screen.getByRole("button", { name: "Descartar" }))

        expect(dpo).toHaveValue("Maria Encarregada")
        expect(screen.queryByText("1 alteração não salva")).not.toBeInTheDocument()
    })

    it("Salvar envia o PUT com as oito chaves e o vazio como null, e a nota passa aos dados da resposta", async () => {
        const saved = privacyView({
            dpoName: null,
            updatedBy: { id: 3, name: "Carla Souza" },
            updatedAt: "2026-11-01T15:00:00.000Z"
        })
        const { user, calls } = await renderPage({
            [`PUT ${PRIVACY_PATH}`]: () => ({ status: 200, body: { data: saved } })
        })
        await openPrivacy(user)
        expect(
            screen.getByText("Última alteração por Bruno Lima em 20/10/2026")
        ).toBeInTheDocument()

        await user.clear(screen.getByLabelText("Nome do encarregado (DPO)"))
        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

        expect(
            await screen.findByText("Última alteração por Carla Souza em 01/11/2026")
        ).toBeInTheDocument()
        expect(calls.filter((call) => call.method === "PUT" && call.path === PRIVACY_PATH)).toEqual(
            [
                {
                    method: "PUT",
                    path: PRIVACY_PATH,
                    body: {
                        controllerName: "Prefeitura de Jacareí",
                        dpoName: null,
                        contactEmail: "privacidade@exemplo.test",
                        inPersonContact: null,
                        retentionText: "Sessões por 12 meses.",
                        retentionEnabled: false,
                        sessionRetentionDays: 90,
                        appointmentRetentionDays: 365
                    }
                }
            ]
        )
        expect(screen.queryByRole("button", { name: "Descartar" })).not.toBeInTheDocument()
    })

    it("o PUT recusado mostra o alerta com a mensagem do erro e mantém a alteração pendente", async () => {
        const { user } = await renderPage({
            [`PUT ${PRIVACY_PATH}`]: () => ({
                status: 400,
                body: { error: { code: "BAD_REQUEST", message: "Dados inválidos" } }
            })
        })
        await openPrivacy(user)

        await user.type(screen.getByLabelText("Nome do encarregado (DPO)"), " Silva")
        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Não foi possível salvar a configuração de privacidade agora. Tente de novo."
        )
        expect(screen.getByText("1 alteração não salva")).toBeInTheDocument()
        expect(screen.getByLabelText("Nome do encarregado (DPO)")).toHaveValue(
            "Maria Encarregada Silva"
        )
    })

    it("a nota e a barra seguem a aba ativa e a pendência da privacidade fica guardada", async () => {
        const { user } = await renderPage()
        await openPrivacy(user)
        await user.type(screen.getByLabelText("Nome do encarregado (DPO)"), " Silva")
        expect(
            screen.getByText("Última alteração por Bruno Lima em 20/10/2026")
        ).toBeInTheDocument()

        await user.click(screen.getByRole("tab", { name: "Conexão" }))
        expect(screen.getByText("Última alteração por Ana Paula em 14/10/2026")).toBeInTheDocument()
        expect(screen.queryByText("1 alteração não salva")).not.toBeInTheDocument()
        await user.click(screen.getByRole("tab", { name: "Privacidade" }))

        expect(
            screen.getByText("Última alteração por Bruno Lima em 20/10/2026")
        ).toBeInTheDocument()
        expect(screen.getByText("1 alteração não salva")).toBeInTheDocument()
        expect(screen.getByLabelText("Nome do encarregado (DPO)")).toHaveValue(
            "Maria Encarregada Silva"
        )
    })
})
