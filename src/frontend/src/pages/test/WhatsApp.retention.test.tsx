import { Provider } from "react-redux"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import type PrivacySettings from "@/types/privacy/PrivacySettings.types"
import type WhatsAppSettings from "@/types/whatsapp/WhatsAppSettings.types"

vi.setConfig({ testTimeout: 20000 })

const PRIVACY_PATH = "/api/v1/whatsapp/settings/privacy"
const PREVIEW_PATH = `${PRIVACY_PATH}/retention-preview`
const SWITCH = "Anonimização automática"
const SESSION_DAYS = "Prazo das conversas (dias)"
const APPOINTMENT_DAYS = "Prazo dos agendamentos (dias)"

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
type Handler = (body: unknown) => Reply
type Call = { method: string; path: string; search: string; body: unknown }

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
        const url = new URL(request ? request.url : String(input), "http://localhost")
        const method = request ? request.method : (init?.method ?? "GET")
        const body = await bodyOf(request, init)
        calls.push({ method, path: url.pathname, search: url.search, body })
        const handler = handlers[`${method} ${url.pathname}`]

        if (!handler) {
            return respond(404, { error: { code: "NOT_FOUND", message: "x" } })
        }

        const reply = handler(body)

        return respond(reply.status, reply.body)
    })
    vi.stubGlobal("fetch", fetchMock)

    return calls
}

async function openRetention(
    view: PrivacySettings = privacyView(),
    preview: Reply = { status: 200, body: { data: { sessions: 4, appointments: 2 } } }
) {
    vi.stubEnv("VITE_API_URL", "http://api.test")
    vi.resetModules()
    const calls = stubApi({
        "GET /api/v1/whatsapp/settings": () => ({ status: 200, body: { data: SETTINGS } }),
        [`GET ${PRIVACY_PATH}`]: () => ({ status: 200, body: { data: view } }),
        [`GET ${PREVIEW_PATH}`]: () => preview,
        [`PUT ${PRIVACY_PATH}`]: (body) => ({
            status: 200,
            body: { data: { ...view, ...(body as object) } }
        })
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
    await user.click(await screen.findByRole("tab", { name: "Privacidade" }))
    await screen.findByRole("switch", { name: SWITCH })

    const puts = () => calls.filter((call) => call.method === "PUT")
    const previews = () => calls.filter((call) => call.path === PREVIEW_PATH)

    return { user, puts, previews }
}

async function typeDays(user: ReturnType<typeof userEvent.setup>, label: string, value: string) {
    const input = screen.getByLabelText(label)
    await user.clear(input)
    if (value !== "") {
        await user.type(input, value)
    }
}

async function clickSave(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }))
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("WhatsAppPage, anonimização automática na aba Privacidade", () => {
    it.each(["29", "1826", "", "30.5"])(
        "o prazo das conversas %s mostra a faixa e desabilita Salvar",
        async (value) => {
            const { user } = await openRetention()

            await typeDays(user, SESSION_DAYS, value)

            expect(screen.getByText("Use um número inteiro de 30 a 1825.")).toBeInTheDocument()
            expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeDisabled()
        }
    )

    it("o prazo das conversas 30 não mostra mensagem e deixa salvar", async () => {
        const { user } = await openRetention()

        await typeDays(user, SESSION_DAYS, "30")

        expect(screen.queryByText("Use um número inteiro de 30 a 1825.")).not.toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeEnabled()
    })

    it("o prazo dos agendamentos 89 mostra a faixa dos agendamentos", async () => {
        const { user } = await openRetention()

        await typeDays(user, APPOINTMENT_DAYS, "89")

        expect(screen.getByText("Use um número inteiro de 90 a 1825.")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeDisabled()
    })

    it("mostra o interruptor e os prazos com os valores da API", async () => {
        await openRetention(
            privacyView({
                retentionEnabled: true,
                sessionRetentionDays: 120,
                appointmentRetentionDays: 400
            })
        )

        const toggle = screen.getByRole("switch", { name: SWITCH })
        expect(toggle).toHaveAttribute("aria-checked", "true")
        expect(
            screen.getByLabelText("Prazos de guarda").compareDocumentPosition(toggle) &
                Node.DOCUMENT_POSITION_FOLLOWING
        ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
        expect(screen.getByLabelText(SESSION_DAYS)).toHaveValue(120)
        expect(screen.getByLabelText(APPOINTMENT_DAYS)).toHaveValue(400)
    })

    it("ligar o interruptor conta 1 alteração e Descartar volta ao desligado", async () => {
        const { user } = await openRetention()
        const toggle = screen.getByRole("switch", { name: SWITCH })

        await user.click(toggle)
        expect(toggle).toHaveAttribute("aria-checked", "true")
        expect(screen.getByText("1 alteração não salva")).toBeInTheDocument()
        await user.click(screen.getByRole("button", { name: "Descartar" }))

        expect(toggle).toHaveAttribute("aria-checked", "false")
        expect(screen.queryByText("1 alteração não salva")).not.toBeInTheDocument()
    })

    it("ligar e salvar pede a prévia, confirma e só então envia o PUT com as oito chaves", async () => {
        const { user, puts, previews } = await openRetention()

        await user.click(screen.getByRole("switch", { name: SWITCH }))
        await clickSave(user)

        const dialog = await screen.findByRole("dialog", {
            name: "Ligar a anonimização automática?"
        })
        expect(dialog).toHaveTextContent(
            "Com estes prazos, 4 conversas e 2 agendamentos já passaram do prazo e serão anonimizados nas próximas horas. Isso não pode ser desfeito."
        )
        expect(previews().map((call) => call.search)).toEqual([
            "?sessionDays=90&appointmentDays=365"
        ])
        expect(puts()).toEqual([])
        await user.click(within(dialog).getByRole("button", { name: "Anonimizar" }))

        await vi.waitFor(() => expect(puts()).toHaveLength(1))
        expect(puts()[0]?.body).toEqual({
            controllerName: "Prefeitura de Jacareí",
            dpoName: "Maria Encarregada",
            contactEmail: "privacidade@exemplo.test",
            inPersonContact: null,
            retentionText: "Sessões por 12 meses.",
            retentionEnabled: true,
            sessionRetentionDays: 90,
            appointmentRetentionDays: 365
        })
    })

    it("a prévia com 1 e 1 usa o singular", async () => {
        const { user } = await openRetention(privacyView(), {
            status: 200,
            body: { data: { sessions: 1, appointments: 1 } }
        })

        await user.click(screen.getByRole("switch", { name: SWITCH }))
        await clickSave(user)

        expect(await screen.findByRole("dialog")).toHaveTextContent(
            "Com estes prazos, 1 conversa e 1 agendamento já passaram do prazo e serão anonimizados nas próximas horas. Isso não pode ser desfeito."
        )
    })

    it("a prévia com zero registros também abre o diálogo com o texto de nenhum registro", async () => {
        const { user } = await openRetention(privacyView(), {
            status: 200,
            body: { data: { sessions: 0, appointments: 0 } }
        })

        await user.click(screen.getByRole("switch", { name: SWITCH }))
        await clickSave(user)

        expect(await screen.findByRole("dialog")).toHaveTextContent(
            "Com estes prazos, nenhum registro passou do prazo agora. A partir de agora, o que passar do prazo será anonimizado a cada hora. Isso não pode ser desfeito."
        )
    })

    it("com o interruptor ligado, reduzir o prazo das conversas pede confirmação de redução", async () => {
        const { user, previews } = await openRetention(privacyView({ retentionEnabled: true }))

        await typeDays(user, SESSION_DAYS, "60")
        await clickSave(user)

        expect(
            await screen.findByRole("dialog", { name: "Reduzir o prazo de guarda?" })
        ).toBeInTheDocument()
        expect(previews().map((call) => call.search)).toEqual([
            "?sessionDays=60&appointmentDays=365"
        ])
    })

    it("Cancelar no diálogo não envia o PUT e mantém a alteração pendente", async () => {
        const { user, puts } = await openRetention()

        await user.click(screen.getByRole("switch", { name: SWITCH }))
        await clickSave(user)
        await user.click(
            within(await screen.findByRole("dialog")).getByRole("button", { name: "Cancelar" })
        )

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
        expect(puts()).toEqual([])
        expect(screen.getByText("1 alteração não salva")).toBeInTheDocument()
    })

    it.each([
        {
            label: "aumentar um prazo com o interruptor ligado",
            view: privacyView({ retentionEnabled: true }),
            change: (user: ReturnType<typeof userEvent.setup>) =>
                typeDays(user, SESSION_DAYS, "120")
        },
        {
            label: "mudar só o texto com o interruptor desligado",
            view: privacyView(),
            change: (user: ReturnType<typeof userEvent.setup>) =>
                user.type(screen.getByLabelText("Nome do encarregado (DPO)"), " Silva")
        }
    ])("$label envia o PUT direto, sem prévia nem diálogo", async ({ view, change }) => {
        const { user, puts, previews } = await openRetention(view)

        await change(user)
        await clickSave(user)

        await vi.waitFor(() => expect(puts()).toHaveLength(1))
        expect(previews()).toEqual([])
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    it("a prévia que falha mostra o alerta, sem diálogo nem PUT, e mantém a alteração", async () => {
        const { user, puts } = await openRetention(privacyView(), {
            status: 500,
            body: { error: { code: "X", message: "x" } }
        })

        await user.click(screen.getByRole("switch", { name: SWITCH }))
        await clickSave(user)

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Não foi possível calcular quantos registros seriam anonimizados. Tente de novo."
        )
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
        expect(puts()).toEqual([])
        expect(screen.getByText("1 alteração não salva")).toBeInTheDocument()
    })
})
