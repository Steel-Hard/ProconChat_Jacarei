import { screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import buildReportsSummary from "@/testUtils/buildReportsSummary"
import renderReportsPage from "@/testUtils/renderReportsPage"
import type PanelAccount from "@/types/account/PanelAccount.types"

vi.setConfig({ testTimeout: 30000 })

const NO_ACCESS: PanelAccount = {
    id: 2,
    name: "Carla",
    email: "carla@exemplo.gov.br",
    isAdmin: false,
    permissions: ["reports.view"]
}

const WITH_SCHEDULE: PanelAccount = {
    ...NO_ACCESS,
    permissions: ["reports.view", "schedule.configure"]
}

const LABELS = [
    "Resolvida sem agendamento",
    "Terminou em agendamento",
    "Fora do escopo do PROCON",
    "Sem horário disponível na janela",
    "Não quis agendar",
    "Remarcou ou cancelou agendamento existente",
    "Abandonada"
]

const DEFINITIONS: Record<string, string> = {
    "Resolvida sem agendamento": "O cidadão respondeu no chatbot que a dúvida foi resolvida.",
    "Terminou em agendamento": "A conversa terminou com um agendamento criado.",
    "Fora do escopo do PROCON":
        "Encaminhada a outro órgão, conforme o conteúdo marcado como fora do escopo.",
    "Sem horário disponível na janela":
        "O cidadão quis agendar, mas não havia horário livre na janela de agendamento.",
    "Não quis agendar":
        "O cidadão respondeu que a dúvida não foi resolvida e recusou o agendamento.",
    "Remarcou ou cancelou agendamento existente":
        "Conversas em que o cidadão voltou ao chatbot apenas para remarcar ou cancelar um agendamento já existente.",
    Abandonada: "Sem interação por mais de 30 minutos antes de um desfecho."
}

function outcomesCard(): HTMLElement {
    return screen
        .getByRole("heading", { level: 2, name: "Desfecho das conversas" })
        .closest("section") as HTMLElement
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("Reports: cartão Conversas no período", () => {
    it("mostra o rótulo como h2, o número com milhar, a média e os agendamentos criados", async () => {
        const page = await renderReportsPage()
        await page.loaded()

        const heading = screen.getByRole("heading", { level: 2, name: "Conversas no período" })
        const card = within(heading.closest("section") as HTMLElement)

        expect(card.getByText("1.234")).toBeInTheDocument()
        expect(card.getByText("Média de 11,3 por dia · 8 agendamentos criados")).toBeInTheDocument()
    })

    it("não força zero na média e usa o singular", async () => {
        const base = buildReportsSummary()
        const page = await renderReportsPage({
            summary: {
                ...base,
                conversations: { total: 11, dailyAverage: 11, appointmentsCreated: 1 }
            }
        })
        await page.loaded()

        expect(screen.getByText("Média de 11 por dia · 1 agendamento criado")).toBeInTheDocument()
    })

    it("explica o que é uma conversa em um tooltip", async () => {
        const page = await renderReportsPage()
        await page.loaded()

        await page.user.click(
            screen.getByRole("button", { name: "Definição de conversas no período" })
        )

        expect(screen.getByRole("tooltip")).toHaveTextContent(
            "Conversas iniciadas no WhatsApp com o chatbot no período selecionado."
        )
    })
})

describe("Reports: cartão Desfecho das conversas", () => {
    it("lista os desfechos na ordem, com os rótulos da regra", async () => {
        const page = await renderReportsPage()
        await page.loaded()

        const names = within(outcomesCard())
            .getAllByRole("listitem")
            .map((item) => LABELS.find((label) => item.textContent?.includes(label)))

        expect(names).toEqual(LABELS)
    })

    it("não mostra Em andamento quando a API não envia", async () => {
        const page = await renderReportsPage()
        await page.loaded()

        expect(within(outcomesCard()).queryByText("Em andamento")).toBeNull()
    })

    it("mostra Em andamento quando há conversas", async () => {
        const base = buildReportsSummary()
        const page = await renderReportsPage({
            summary: {
                ...base,
                outcomes: [
                    ...base.outcomes,
                    { outcome: "IN_PROGRESS", label: "x", count: 1, percentage: 2 }
                ]
            }
        })
        await page.loaded()

        const item = within(outcomesCard()).getByText("Em andamento").closest("li") as HTMLElement

        expect(within(item).getByText("2,0%")).toBeInTheDocument()
        expect(within(item).getByText("1 conversa")).toBeInTheDocument()
    })

    it("mostra o percentual com uma casa e a quantidade de conversas", async () => {
        const page = await renderReportsPage()
        await page.loaded()

        const item = within(outcomesCard())
            .getByText("Resolvida sem agendamento")
            .closest("li") as HTMLElement

        expect(within(item).getByText("25,0%")).toBeInTheDocument()
        expect(within(item).getByText("10 conversas")).toBeInTheDocument()
    })

    it("desenha a barra com um segmento por desfecho, largura igual ao percentual", async () => {
        const page = await renderReportsPage()
        await page.loaded()

        const bar = within(outcomesCard()).getByTestId("outcome-bar")
        const first = bar.children[0] as HTMLElement

        expect(bar).toHaveAttribute("aria-hidden", "true")
        expect(bar.children).toHaveLength(7)
        expect(first.style.width).toBe("25%")
        expect(first).toHaveAttribute("title", "Resolvida sem agendamento: 25,0%")
    })

    it("destaca Sem horário disponível com a frase de apoio e o link para Horários", async () => {
        const page = await renderReportsPage()
        await page.loaded()

        const item = within(outcomesCard())
            .getByText("Sem horário disponível na janela")
            .closest("li") as HTMLElement

        expect(item.className).toContain("outcomeHighlight")
        expect(
            within(item).getByText("O chatbot não conseguiu oferecer horário.")
        ).toBeInTheDocument()
        expect(
            within(item).getByRole("link", { name: "Horários de atendimento →" })
        ).toHaveAttribute("href", "/horarios")
    })

    it("mostra o link para Horários a quem pode abrir Horários", async () => {
        const page = await renderReportsPage({ account: WITH_SCHEDULE })
        await page.loaded()

        expect(
            within(outcomesCard()).getByRole("link", { name: "Horários de atendimento →" })
        ).toBeInTheDocument()
    })

    it("sem permissão para Horários mantém o destaque e a frase, sem o link", async () => {
        const page = await renderReportsPage({ account: NO_ACCESS })
        await page.loaded()

        const item = within(outcomesCard())
            .getByText("Sem horário disponível na janela")
            .closest("li") as HTMLElement

        expect(item.className).toContain("outcomeHighlight")
        expect(
            within(item).getByText("O chatbot não conseguiu oferecer horário.")
        ).toBeInTheDocument()
        expect(within(outcomesCard()).queryByRole("link")).toBeNull()
    })

    it.each(LABELS)("explica %s em um tooltip", async (label) => {
        const page = await renderReportsPage()
        await page.loaded()

        await page.user.click(screen.getByRole("button", { name: `Definição de ${label}` }))

        expect(screen.getByRole("tooltip")).toHaveTextContent(DEFINITIONS[label] as string)
    })

    it("explica o cartão em um tooltip com a regra de 100%", async () => {
        const page = await renderReportsPage()
        await page.loaded()

        await page.user.click(
            screen.getByRole("button", { name: "Definição dos desfechos das conversas" })
        )

        expect(screen.getByRole("tooltip")).toHaveTextContent(
            "Cada conversa do período tem um único desfecho. As categorias somam 100%."
        )
    })

    it("com nenhuma conversa mostra zeros sem quebrar", async () => {
        const base = buildReportsSummary()
        const page = await renderReportsPage({
            summary: {
                ...base,
                conversations: { total: 0, dailyAverage: 0, appointmentsCreated: 0 },
                outcomes: base.outcomes.map((item) => ({ ...item, count: 0, percentage: 0 }))
            }
        })
        await page.loaded()

        const card = within(outcomesCard())

        expect(card.getAllByText("0,0%")).toHaveLength(7)
        expect(card.getAllByText("0 conversas")).toHaveLength(7)
    })
})
