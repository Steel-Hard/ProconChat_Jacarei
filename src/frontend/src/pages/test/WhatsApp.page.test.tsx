import { Provider } from "react-redux"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import type WhatsAppSettings from "@/types/whatsapp/WhatsAppSettings.types"

const NEW_TOKEN = "EAAG-token-novo-ficticio-77Zz"
const PAUSED_MESSAGE =
    "O atendimento automático do PROCON Jacareí está temporariamente indisponível. Tente novamente mais tarde."
const NEED_TEST = "Teste a conexão com as credenciais novas antes de salvar."

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
        autoReplyPaused: false,
        pausedMessage: PAUSED_MESSAGE,
        updatedBy: { id: 1, name: "Ana Paula" },
        updatedAt: "2026-10-14T13:00:00.000Z",
        displayPhoneNumber: "+55 12 3955-9000",
        verifiedName: "PROCON Jacareí",
        ...overrides
    }
}

type Reply = { status: number; body?: unknown }
type Handler = (body: unknown) => Reply | Promise<Reply>
type Call = { method: string; path: string; body: unknown }

function noRelease() {}

const OK_TEST: Handler = () => ({
    status: 200,
    body: {
        data: {
            ok: true,
            displayPhoneNumber: "+55 12 3955-9000",
            verifiedName: "PROCON Jacareí",
            checkedAt: "2026-10-15T10:00:00.000Z"
        }
    }
})

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
        ...handlers
    })
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

    return { calls, store, user }
}

async function loaded() {
    await screen.findByRole("heading", { name: "Credenciais" })
}

function callsTo(calls: Call[], method: string, path: string): Call[] {
    return calls.filter((call) => call.method === method && call.path === path)
}

function group(name: string): HTMLElement {
    return screen.getByRole("group", { name })
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("WhatsAppPage", () => {
    it("mostra o título, o subtítulo e o carregando enquanto a leitura não chega", async () => {
        await renderPage({ "GET /api/v1/whatsapp/settings": () => new Promise<Reply>(() => {}) })

        expect(screen.getByRole("heading", { name: "WhatsApp" })).toBeInTheDocument()
        expect(
            screen.getByText(
                "Conexão do número institucional com a WhatsApp Cloud API, oficial da Meta. Acesso exclusivo da conta admin."
            )
        ).toBeInTheDocument()
        expect(screen.getByText("Carregando...")).toBeInTheDocument()
        expect(screen.queryByLabelText("ID do número de telefone")).not.toBeInTheDocument()
    })

    it("mostra erro mantendo o título e sem campos quando a leitura falha", async () => {
        await renderPage({
            "GET /api/v1/whatsapp/settings": () => ({
                status: 500,
                body: { error: { code: "INTERNAL_SERVER_ERROR", message: "x" } }
            })
        })

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Não foi possível carregar a configuração do WhatsApp agora. Tente de novo."
        )
        expect(screen.getByRole("heading", { name: "WhatsApp" })).toBeInTheDocument()
        expect(screen.queryByLabelText("ID do número de telefone")).not.toBeInTheDocument()
    })

    it("mostra os IDs editáveis e os segredos só mascarados com Substituir", async () => {
        await renderPage()
        await loaded()

        expect(screen.getByLabelText("ID do número de telefone")).toHaveValue("100000000000001")
        expect(screen.getByLabelText("ID da conta WhatsApp Business")).toHaveValue(
            "200000000000002"
        )
        const token = group("Token de acesso")
        expect(within(token).getByText("••••••••a91F")).toBeInTheDocument()
        expect(within(token).getByRole("button", { name: "Substituir" })).toBeInTheDocument()
        expect(
            within(token).getByText(
                "Guardado criptografado. Não é possível visualizar o valor salvo."
            )
        ).toBeInTheDocument()
        expect(
            within(token).getByText(
                "Use um token permanente de usuário do sistema; o token temporário expira em 24 horas."
            )
        ).toBeInTheDocument()
        expect(within(group("App Secret")).getByText("••••••••9c2e")).toBeInTheDocument()
    })

    it("mostra só a máscara quando o segredo salvo não tem os 4 últimos caracteres", async () => {
        await renderPage({}, settingsView({ appSecret: { configured: true, last4: null } }))
        await loaded()

        expect(within(group("App Secret")).getByText("••••••••")).toBeInTheDocument()
        expect(
            within(group("App Secret")).getByRole("button", { name: "Substituir" })
        ).toBeInTheDocument()
    })

    it("mostra o campo de digitação direto para o segredo ainda não configurado", async () => {
        await renderPage({}, settingsView({ accessToken: { configured: false, last4: null } }))
        await loaded()

        const input = screen.getByLabelText("Token de acesso", { selector: "input" })
        expect(input).toHaveAttribute("type", "password")
        expect(input).toHaveValue("")
        expect(
            within(group("Token de acesso")).queryByRole("button", { name: "Substituir" })
        ).not.toBeInTheDocument()
    })

    it("Substituir abre um campo de senha sem preenchimento e Cancelar volta à máscara", async () => {
        const { user } = await renderPage()
        await loaded()

        await user.click(
            within(group("Token de acesso")).getByRole("button", { name: "Substituir" })
        )
        const input = screen.getByLabelText("Token de acesso", { selector: "input" })
        await user.type(input, NEW_TOKEN)

        expect(input).toHaveAttribute("type", "password")
        expect(input).toHaveAttribute("autocomplete", "off")
        expect(input).toHaveAttribute("placeholder", "Cole o novo valor")
        expect(screen.getByText("1 alteração não salva")).toBeInTheDocument()

        await user.click(within(group("Token de acesso")).getByRole("button", { name: "Cancelar" }))

        expect(within(group("Token de acesso")).getByText("••••••••a91F")).toBeInTheDocument()
        expect(screen.queryByText("1 alteração não salva")).not.toBeInTheDocument()
    })

    it("lista as alterações e trava o Salvar até um teste bem-sucedido com os valores atuais", async () => {
        const { user, calls } = await renderPage({ "POST /api/v1/whatsapp/settings/test": OK_TEST })
        await loaded()

        await user.clear(screen.getByLabelText("ID do número de telefone"))
        await user.type(screen.getByLabelText("ID do número de telefone"), "100000000000009")
        await user.click(
            within(group("Token de acesso")).getByRole("button", { name: "Substituir" })
        )
        await user.type(screen.getByLabelText("Token de acesso", { selector: "input" }), NEW_TOKEN)
        await user.hover(screen.getByText("2 alterações não salvas"))

        expect(screen.getByRole("tooltip")).toHaveTextContent(
            "Pendentes: ID do número de telefone; Token de acesso"
        )
        expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeDisabled()
        expect(screen.getByText(NEED_TEST)).toBeInTheDocument()

        await user.click(screen.getByRole("button", { name: "Testar conexão" }))

        expect(
            await screen.findByText("Número verificado: +55 12 3955-9000 · Nome: PROCON Jacareí", {
                exact: false
            })
        ).toBeInTheDocument()
        expect(screen.getByText("Conexão testada com sucesso.")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeEnabled()
        expect(screen.queryByText(NEED_TEST)).not.toBeInTheDocument()
        expect(callsTo(calls, "POST", "/api/v1/whatsapp/settings/test")[0]?.body).toEqual({
            phoneNumberId: "100000000000009",
            businessAccountId: "200000000000002",
            accessToken: NEW_TOKEN,
            appSecret: null
        })

        await user.type(screen.getByLabelText("ID da conta WhatsApp Business"), "1")

        expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeDisabled()
        expect(screen.queryByText("Conexão testada com sucesso.")).not.toBeInTheDocument()
    })

    it("mostra Testando e desabilita o botão enquanto o teste está em andamento", async () => {
        let release: (reply: Reply) => void = noRelease
        const { user } = await renderPage({
            "POST /api/v1/whatsapp/settings/test": () =>
                new Promise<Reply>((resolve) => {
                    release = resolve
                })
        })
        await loaded()

        await user.click(screen.getByRole("button", { name: "Testar conexão" }))

        expect(await screen.findByText("Testando conexão com a Meta…")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Testar conexão" })).toBeDisabled()
        release({
            status: 200,
            body: { data: { ok: false, reason: "INVALID_TOKEN", checkedAt: "x" } }
        })
        expect(await screen.findByText("Token inválido ou expirado")).toBeInTheDocument()
        expect(screen.getByText("Falha no teste.")).toBeInTheDocument()
    })

    it("não chama a API e pede o ID da conta quando ele está vazio", async () => {
        const { user, calls } = await renderPage({}, settingsView({ businessAccountId: null }))
        await loaded()

        expect(screen.getByLabelText("ID da conta WhatsApp Business")).toHaveValue("")
        await user.click(screen.getByRole("button", { name: "Testar conexão" }))

        expect(
            await screen.findByText(
                'Preencha o campo "ID da conta WhatsApp Business" ou cancele a substituição antes de testar.'
            )
        ).toBeInTheDocument()
        expect(callsTo(calls, "POST", "/api/v1/whatsapp/settings/test")).toHaveLength(0)
    })

    it("salva depois do teste, mostra o aviso e a máscara com os novos 4 últimos caracteres", async () => {
        const saved = settingsView({ accessToken: { configured: true, last4: "77Zz" } })
        const { user, calls } = await renderPage({
            "POST /api/v1/whatsapp/settings/test": OK_TEST,
            "PUT /api/v1/whatsapp/settings": () => ({ status: 200, body: { data: saved } })
        })
        await loaded()
        await user.click(
            within(group("Token de acesso")).getByRole("button", { name: "Substituir" })
        )
        await user.type(screen.getByLabelText("Token de acesso", { selector: "input" }), NEW_TOKEN)
        await user.click(screen.getByRole("button", { name: "Testar conexão" }))
        await screen.findByText("Conexão testada com sucesso.")

        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

        expect(
            await screen.findByText("Credenciais salvas. O chatbot já usa os novos valores.")
        ).toBeInTheDocument()
        expect(within(group("Token de acesso")).getByText("••••••••77Zz")).toBeInTheDocument()
        expect(screen.queryByText("Conexão testada com sucesso.")).not.toBeInTheDocument()
        expect(screen.queryByText(/não salvas?$/)).not.toBeInTheDocument()
        expect(callsTo(calls, "PUT", "/api/v1/whatsapp/settings")[0]?.body).toEqual({
            phoneNumberId: "100000000000001",
            businessAccountId: "200000000000002",
            accessToken: NEW_TOKEN,
            appSecret: null
        })
        expect(document.body.textContent).not.toContain(NEW_TOKEN)
    })

    it("Descartar volta aos valores do servidor e cancela as substituições", async () => {
        const { user } = await renderPage()
        await loaded()
        await user.type(screen.getByLabelText("ID do número de telefone"), "9")
        await user.click(within(group("App Secret")).getByRole("button", { name: "Substituir" }))
        await user.type(screen.getByLabelText("App Secret", { selector: "input" }), "segredo-novo")

        await user.click(screen.getByRole("button", { name: "Descartar" }))

        expect(screen.getByLabelText("ID do número de telefone")).toHaveValue("100000000000001")
        expect(within(group("App Secret")).getByText("••••••••9c2e")).toBeInTheDocument()
        expect(screen.queryByRole("button", { name: "Descartar" })).not.toBeInTheDocument()
    })

    it("mostra a URL do webhook e o token de verificação com Copiar", async () => {
        const { user } = await renderPage()
        await loaded()
        const writeText = vi.spyOn(navigator.clipboard, "writeText")

        await user.click(within(group("URL do webhook")).getByRole("button", { name: "Copiar" }))

        expect(writeText).toHaveBeenCalledWith("https://exemplo.sslip.io/webhooks/whatsapp")
        expect(await screen.findByText("Copiado.")).toBeInTheDocument()
        expect(
            within(group("Token de verificação")).getByText("3f9a".repeat(16))
        ).toBeInTheDocument()
    })

    it("avisa quando não consegue copiar", async () => {
        const { user } = await renderPage()
        await loaded()
        vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("negado"))

        await user.click(
            within(group("Token de verificação")).getByRole("button", { name: "Copiar" })
        )

        expect(await screen.findByText("Não foi possível copiar.")).toBeInTheDocument()
    })

    it("sem URL pública mostra o aviso no lugar da URL e sem Copiar nesse item", async () => {
        await renderPage({}, settingsView({ webhookUrl: null }))
        await loaded()

        const webhook = group("URL do webhook")
        expect(
            within(webhook).getByText(
                "A URL pública do sistema não está configurada no servidor. Peça à equipe técnica para definir PUBLIC_BASE_URL."
            )
        ).toBeInTheDocument()
        expect(within(webhook).queryByRole("button", { name: "Copiar" })).not.toBeInTheDocument()
        expect(screen.getAllByRole("button", { name: "Copiar" })).toHaveLength(1)
    })

    it("mostra o passo a passo na ordem das regras", async () => {
        await renderPage()
        await loaded()

        const steps = within(screen.getByRole("list")).getAllByRole("listitem")

        expect(steps.map((step) => step.textContent)).toEqual([
            "Use um token permanente de usuário do sistema (Gerenciador de Negócios › Usuários do sistema › Gerar token). O token temporário do painel de desenvolvedor expira em 24 horas e o chatbot para de funcionar.",
            "No painel de desenvolvedores da Meta, abra o app e vá em WhatsApp › Configuração.",
            "Em Webhook, clique em Editar e cole a URL do webhook e o token de verificação acima.",
            'Clique em Verificar e salvar e, em Campos do webhook, assine "messages".',
            "Em WhatsApp › Configuração da API, copie o ID do número e o ID da conta e cole-os nos campos ao lado."
        ])
    })

    it("mostra o topo com número, nome, situação, última alteração e a mensagem fixa", async () => {
        await renderPage()
        await loaded()

        expect(screen.getByText("+55 12 3955-9000")).toBeInTheDocument()
        expect(screen.getByText("PROCON Jacareí · WhatsApp Cloud API")).toBeInTheDocument()
        expect(screen.getByText("Operando")).toBeInTheDocument()
        expect(screen.getByText("Última alteração por Ana Paula em 14/10/2026")).toBeInTheDocument()
        expect(
            screen.getByText("Mensagem fixa enviada ao cidadão enquanto estiver pausado")
        ).toBeInTheDocument()
        expect(screen.getByText(PAUSED_MESSAGE)).toBeInTheDocument()
    })

    it("mostra Não verificado e o aviso de número ainda não verificado", async () => {
        await renderPage(
            {},
            settingsView({ credentialsValid: null, displayPhoneNumber: null, verifiedName: null })
        )
        await loaded()

        expect(screen.getByText("Não verificado")).toBeInTheDocument()
        expect(
            screen.getByText("Número ainda não verificado. Teste a conexão.")
        ).toBeInTheDocument()
    })

    it("mostra Não configurado sem o ID do número e nada de última alteração sem autor", async () => {
        await renderPage({}, settingsView({ phoneNumberId: null, updatedBy: null }))
        await loaded()

        expect(screen.getByText("Não configurado")).toBeInTheDocument()
        expect(screen.queryByText(/Última alteração/)).not.toBeInTheDocument()
    })

    it("mostra Credenciais inválidas quando o último teste dos valores salvos falhou", async () => {
        await renderPage({}, settingsView({ credentialsValid: false }))
        await loaded()

        expect(screen.getByText("Credenciais inválidas")).toBeInTheDocument()
    })

    it("pede confirmação com a prévia e pausa na hora ao confirmar", async () => {
        const { user, calls } = await renderPage({
            "POST /api/v1/whatsapp/settings/pause": () => ({
                status: 200,
                body: { data: settingsView({ autoReplyPaused: true }) }
            })
        })
        await loaded()
        const toggle = screen.getByRole("switch", { name: "Pausar respostas automáticas" })
        expect(toggle).toHaveAttribute("aria-checked", "false")
        expect(screen.getByText("Desligado")).toBeInTheDocument()

        await user.click(toggle)
        const dialog = screen.getByRole("dialog", { name: "Pausar respostas automáticas?" })

        expect(dialog).toHaveAccessibleDescription(
            "O chatbot deixará de responder aos cidadãos até ser reativado."
        )
        expect(
            within(dialog).getByText("Quem escrever durante a pausa recebe:")
        ).toBeInTheDocument()
        expect(within(dialog).getByText(PAUSED_MESSAGE)).toBeInTheDocument()
        expect(within(dialog).getByRole("button", { name: "Voltar" })).toBeInTheDocument()

        await user.click(within(dialog).getByRole("button", { name: "Pausar respostas" }))

        expect(await screen.findByText("Respostas automáticas pausadas.")).toBeInTheDocument()
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
        expect(
            screen.getByText(
                "As respostas automáticas estão pausadas. O chatbot não está respondendo aos cidadãos."
            )
        ).toBeInTheDocument()
        expect(
            screen.getByRole("switch", { name: "Pausar respostas automáticas" })
        ).toHaveAttribute("aria-checked", "true")
        expect(screen.getByText("Pausadas")).toBeInTheDocument()
        expect(screen.getByText("Respostas pausadas")).toBeInTheDocument()
        expect(callsTo(calls, "POST", "/api/v1/whatsapp/settings/pause")).toHaveLength(1)
        expect(callsTo(calls, "PUT", "/api/v1/whatsapp/settings")).toHaveLength(0)
    })

    it("Voltar e Esc fecham a confirmação sem pausar", async () => {
        const { user, calls } = await renderPage()
        await loaded()
        const toggle = screen.getByRole("switch", { name: "Pausar respostas automáticas" })

        await user.click(toggle)
        await user.click(screen.getByRole("button", { name: "Voltar" }))
        await user.click(toggle)
        await user.keyboard("{Escape}")

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
        expect(callsTo(calls, "POST", "/api/v1/whatsapp/settings/pause")).toHaveLength(0)
    })

    it("Reativar respostas retoma sem confirmação e mostra o aviso", async () => {
        const { user, calls } = await renderPage(
            {
                "POST /api/v1/whatsapp/settings/resume": () => ({
                    status: 200,
                    body: { data: settingsView({ autoReplyPaused: false }) }
                })
            },
            settingsView({ autoReplyPaused: true })
        )
        await loaded()

        await user.click(screen.getByRole("button", { name: "Reativar respostas" }))

        expect(await screen.findByText("Respostas automáticas reativadas.")).toBeInTheDocument()
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
        expect(
            screen.getByRole("switch", { name: "Pausar respostas automáticas" })
        ).toHaveAttribute("aria-checked", "false")
        expect(callsTo(calls, "POST", "/api/v1/whatsapp/settings/resume")).toHaveLength(1)
    })

    it("desligar o interruptor pausado também reativa sem confirmação", async () => {
        const { user, calls } = await renderPage(
            {
                "POST /api/v1/whatsapp/settings/resume": () => ({
                    status: 200,
                    body: { data: settingsView() }
                })
            },
            settingsView({ autoReplyPaused: true })
        )
        await loaded()

        await user.click(screen.getByRole("switch", { name: "Pausar respostas automáticas" }))

        await waitFor(() =>
            expect(callsTo(calls, "POST", "/api/v1/whatsapp/settings/resume")).toHaveLength(1)
        )
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    it("mostra erro e mantém o estado quando pausar falha", async () => {
        const { user } = await renderPage({
            "POST /api/v1/whatsapp/settings/pause": () => ({
                status: 500,
                body: { error: { code: "INTERNAL_SERVER_ERROR", message: "x" } }
            })
        })
        await loaded()

        await user.click(screen.getByRole("switch", { name: "Pausar respostas automáticas" }))
        await user.click(screen.getByRole("button", { name: "Pausar respostas" }))

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Não foi possível pausar agora. Tente de novo."
        )
        expect(
            screen.getByRole("switch", { name: "Pausar respostas automáticas" })
        ).toHaveAttribute("aria-checked", "false")
    })

    it("não mostra os blocos que pertencem a outras issues", async () => {
        await renderPage()
        await loaded()

        expect(screen.queryByText("Estado do número")).not.toBeInTheDocument()
        expect(screen.queryByText("Modelos de mensagem")).not.toBeInTheDocument()
        expect(screen.queryByText("Histórico de alterações")).not.toBeInTheDocument()
        expect(screen.queryByText("Controles do protótipo")).not.toBeInTheDocument()
    })
})
