import { screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type PublicPrivacySettings from "@/types/privacy/PublicPrivacySettings.types"

const EMPTY: PublicPrivacySettings = {
    controllerName: null,
    dpoName: null,
    contactEmail: null,
    inPersonContact: null,
    retentionText: null,
    retentionEnabled: false,
    sessionRetentionDays: 90,
    appointmentRetentionDays: 365
}

const FILLED: PublicPrivacySettings = {
    controllerName: "Prefeitura de Jacareí",
    dpoName: "Maria Encarregada",
    contactEmail: "privacidade@exemplo.test",
    inPersonContact: "Rua Exemplo, 100, Centro",
    retentionText: "Sessões e eventos por 12 meses.",
    retentionEnabled: false,
    sessionRetentionDays: 90,
    appointmentRetentionDays: 365
}

const HEADINGS = [
    "Quem trata os seus dados",
    "Quais dados coletamos",
    "Para que usamos",
    "O que não guardamos",
    "Mensagens pelo WhatsApp",
    "Por quanto tempo guardamos",
    "Seus direitos e como pedir",
    "Contato"
]

const NOT_REGISTERED = "Informação ainda não cadastrada"

async function renderPage(reply: { status: number; body?: unknown }) {
    vi.stubEnv("VITE_API_URL", "http://api.test")
    vi.resetModules()
    vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response(JSON.stringify(reply.body ?? {}), { status: reply.status }))
    )
    const { default: renderWithStore } = await import("@/testUtils/renderWithStore")
    const { default: PrivacyPolicyPage } = await import("@/pages/PrivacyPolicy.page")

    return renderWithStore(<PrivacyPolicyPage />)
}

async function renderPending() {
    vi.stubEnv("VITE_API_URL", "http://api.test")
    vi.resetModules()
    vi.stubGlobal(
        "fetch",
        vi.fn(() => new Promise<Response>(() => {}))
    )
    const { default: renderWithStore } = await import("@/testUtils/renderWithStore")
    const { default: PrivacyPolicyPage } = await import("@/pages/PrivacyPolicy.page")

    return renderWithStore(<PrivacyPolicyPage />)
}

function section(name: string): HTMLElement {
    const heading = screen.getByRole("heading", { level: 2, name })
    return heading.closest("section") as HTMLElement
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("PrivacyPolicyPage", () => {
    it("com tudo null, mostra Informação ainda não cadastrada no controlador, no encarregado, nos prazos e no e-mail, sem o atendimento presencial", async () => {
        await renderPage({ status: 200, body: { data: EMPTY } })

        await waitFor(() =>
            expect(
                within(section("Quem trata os seus dados")).getAllByText(NOT_REGISTERED)
            ).toHaveLength(2)
        )
        expect(
            within(section("Por quanto tempo guardamos")).getAllByText(NOT_REGISTERED)
        ).toHaveLength(1)
        expect(
            within(section("Seus direitos e como pedir")).getAllByText(NOT_REGISTERED)
        ).toHaveLength(1)
        expect(within(section("Contato")).getAllByText(NOT_REGISTERED)).toHaveLength(1)
        expect(screen.getAllByText(NOT_REGISTERED)).toHaveLength(5)
        expect(screen.queryByText("Atendimento presencial")).not.toBeInTheDocument()
    })

    it("com a leitura pendente, mostra Carregando... em Quem trata os seus dados e em Contato", async () => {
        await renderPending()

        expect(
            await within(section("Quem trata os seus dados")).findByText("Carregando...")
        ).toBeInTheDocument()
        expect(within(section("Contato")).getByText("Carregando...")).toBeInTheDocument()
        expect(screen.getAllByText("Carregando...")).toHaveLength(2)
    })

    it("quando a leitura falha, mostra o alerta e mantém as seções de texto fixo", async () => {
        await renderPage({ status: 500, body: { error: { code: "X", message: "x" } } })

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Não foi possível carregar os dados de contato agora. Tente de novo em instantes."
        )
        expect(
            screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)
        ).toEqual(HEADINGS)
        expect(screen.queryByText("Carregando...")).not.toBeInTheDocument()
    })

    it("mostra os oito títulos de nível 2 nesta ordem", async () => {
        await renderPage({ status: 200, body: { data: FILLED } })

        expect(
            screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)
        ).toEqual(HEADINGS)
    })

    it("com os dados preenchidos, mostra o controlador, o encarregado, os prazos, o atendimento presencial e o e-mail como link", async () => {
        await renderPage({ status: 200, body: { data: FILLED } })

        const who = section("Quem trata os seus dados")
        expect(await within(who).findByText("Prefeitura de Jacareí")).toBeInTheDocument()
        expect(within(who).getByText("Maria Encarregada")).toBeInTheDocument()
        expect(
            within(section("Por quanto tempo guardamos")).getByText(
                "Sessões e eventos por 12 meses."
            )
        ).toBeInTheDocument()
        for (const name of ["Seus direitos e como pedir", "Contato"]) {
            expect(
                within(section(name)).getByRole("link", { name: "privacidade@exemplo.test" })
            ).toHaveAttribute("href", "mailto:privacidade@exemplo.test")
        }
        expect(within(section("Contato")).getByText("Rua Exemplo, 100, Centro")).toBeInTheDocument()
        expect(screen.queryByText(NOT_REGISTERED)).not.toBeInTheDocument()
        expect(screen.queryByText("Carregando...")).not.toBeInTheDocument()
    })

    it("cita a Meta nas mensagens e põe a frase fixa do telefone antes dos prazos cadastrados", async () => {
        await renderPage({ status: 200, body: { data: FILLED } })

        expect(section("Mensagens pelo WhatsApp")).toHaveTextContent("Meta")
        const retention = section("Por quanto tempo guardamos")
        const cadastrado = await within(retention).findByText("Sessões e eventos por 12 meses.")
        const fixa = within(retention).getByText(
            "O telefone informado no agendamento é apagado quando chega o horário do atendimento."
        )
        expect(
            fixa.compareDocumentPosition(cadastrado) & Node.DOCUMENT_POSITION_FOLLOWING
        ).toBeTruthy()
    })

    it("usa o título Política de privacidade - ProconChat na aba do navegador", async () => {
        await renderPage({ status: 200, body: { data: FILLED } })

        await waitFor(() => expect(document.title).toBe("Política de privacidade - ProconChat"))
    })

    it("com a anonimização desligada, não mostra as frases de prazo", async () => {
        await renderPage({ status: 200, body: { data: FILLED } })

        const retention = section("Por quanto tempo guardamos")
        await within(retention).findByText("Sessões e eventos por 12 meses.")

        expect(within(retention).queryByText(/deixam de ficar ligadas ao seu número/)).toBeNull()
        expect(within(retention).queryByText(/O nome e o CPF do agendamento/)).toBeNull()
        expect(
            within(retention).queryByText(/sem identificação, continuam nos relatórios/)
        ).toBeNull()
    })

    it("com a anonimização ligada, mostra as três frases de prazo entre o telefone e os backups", async () => {
        await renderPage({ status: 200, body: { data: { ...FILLED, retentionEnabled: true } } })

        const retention = section("Por quanto tempo guardamos")
        const sessions = await within(retention).findByText(
            "As conversas deixam de ficar ligadas ao seu número 90 dias depois de terminarem. A conversa que gerou um agendamento segue o prazo do agendamento."
        )
        const appointments = within(retention).getByText(
            "O nome e o CPF do agendamento são removidos 365 dias depois da data do atendimento."
        )
        const anonymous = within(retention).getByText(
            "As opções escolhidas nas conversas, sem identificação, continuam nos relatórios do PROCON."
        )
        const phone = within(retention).getByText(
            "O telefone informado no agendamento é apagado quando chega o horário do atendimento."
        )
        const backups = within(retention).getByText(/As cópias de segurança do sistema/)

        const order = [phone, sessions, appointments, anonymous, backups]
        for (let index = 1; index < order.length; index += 1) {
            expect(
                order[index - 1].compareDocumentPosition(order[index]) &
                    Node.DOCUMENT_POSITION_FOLLOWING
            ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
        }
    })
})
