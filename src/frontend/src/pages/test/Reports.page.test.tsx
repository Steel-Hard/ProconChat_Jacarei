import { Provider } from "react-redux"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.setConfig({ testTimeout: 20000 })

const SUMMARY = {
    period: {
        preset: "30d",
        startDate: "2026-10-08",
        endDate: "2026-11-06",
        daysCount: 30,
        today: "2026-11-07"
    },
    conversations: { total: 40, dailyAverage: 1.3, appointmentsCreated: 8 },
    outcomes: [
        { outcome: "RESOLVED", label: "Resolvida sem agendamento", count: 10, percentage: 25 },
        { outcome: "SCHEDULED", label: "Terminou em agendamento", count: 8, percentage: 20 },
        { outcome: "OUT_OF_SCOPE", label: "Fora do escopo do PROCON", count: 2, percentage: 5 },
        { outcome: "NO_SLOT", label: "Sem horário disponível na janela", count: 4, percentage: 10 },
        { outcome: "DECLINED", label: "Não quis agendar", count: 2, percentage: 5 },
        {
            outcome: "MANAGED_APPOINTMENT",
            label: "Remarcou ou cancelou agendamento existente",
            count: 2,
            percentage: 5
        },
        { outcome: "ABANDONED", label: "Abandonada", count: 12, percentage: 30 }
    ],
    topCategories: [
        { categoryId: "2", title: "Consumidor", conversationsCount: 20 },
        { categoryId: "1", title: "Serviços", conversationsCount: 12 }
    ],
    topQuestions: [
        {
            questionId: "3",
            question: "Como contestar uma cobrança indevida?",
            shortTitle: "Cobrança indevida",
            categoryId: "2",
            categoryTitle: "Consumidor",
            conversationsCount: 9
        }
    ],
    appointmentsResult: {
        attended: 5,
        noShow: 2,
        canceled: 1,
        waitingRecord: 0,
        upcoming: 2,
        total: 10,
        recordedTotal: 7,
        noShowRate: 28.6
    }
}

type Reply = { status: number; body: unknown }
type Call = { url: URL; method: string }

async function renderReportsPage(
    handler: (url: URL) => Reply | Promise<Reply> = () => ({
        status: 200,
        body: { data: SUMMARY }
    })
) {
    vi.stubEnv("VITE_API_URL", "http://api.test")
    vi.resetModules()
    const calls: Call[] = []
    vi.stubGlobal(
        "fetch",
        vi.fn(async (input: Request) => {
            const url = new URL(input.url)
            calls.push({ url, method: input.method })
            const reply = await handler(url)
            return new Response(JSON.stringify(reply.body), {
                status: reply.status,
                headers: { "Content-Type": "application/json" }
            })
        })
    )
    const { default: createStore } = await import("@/store/createStore")
    const { default: ReportsPage } = await import("@/pages/Reports.page")
    const store = createStore()
    const user = userEvent.setup()

    render(
        <Provider store={store}>
            <ReportsPage />
        </Provider>
    )

    return { user, calls }
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("ReportsPage", () => {
    it("mostra carregamento enquanto espera a resposta da API", async () => {
        await renderReportsPage(
            () =>
                new Promise<Reply>((resolve) => {
                    setTimeout(() => resolve({ status: 200, body: { data: SUMMARY } }), 500)
                })
        )

        expect(screen.getByText("Carregando...")).toBeInTheDocument()
        expect(await screen.findByText("Conversas iniciadas")).toBeInTheDocument()
    })

    it("carrega e apresenta os totais agregados, desfechos, categorias, perguntas e agendamentos", async () => {
        const { calls } = await renderReportsPage()

        expect(await screen.findByText("Conversas iniciadas")).toBeInTheDocument()
        expect(screen.getByText("Dados de 08/10/2026 a 06/11/2026")).toBeInTheDocument()
        expect(screen.getByText("Conversas iniciadas")).toBeInTheDocument()
        expect(screen.getByText("Agendamentos criados")).toBeInTheDocument()
        expect(screen.getByText("Sem horário disponível na janela")).toBeInTheDocument()
        expect(screen.getAllByText("Consumidor")).toHaveLength(2)
        expect(screen.getByText("Cobrança indevida")).toBeInTheDocument()
        expect(screen.getByText("Taxa de não comparecimento: 28,6%")).toBeInTheDocument()
        expect(screen.getByText("Total com atendimento no período")).toBeInTheDocument()
        expect(calls).toHaveLength(1)
        expect(calls[0]?.url.searchParams.get("period")).toBe("30d")
    })

    it("consulta novamente ao selecionar um período predefinido", async () => {
        const { user, calls } = await renderReportsPage()
        await screen.findByText("Conversas iniciadas")

        await user.click(screen.getByRole("button", { name: "Últimos 7 dias" }))

        await waitFor(() => {
            expect(calls).toHaveLength(2)
            expect(calls[1]?.url.searchParams.get("period")).toBe("7d")
        })
        expect(screen.getByRole("button", { name: "Últimos 7 dias" })).toHaveAttribute(
            "aria-pressed",
            "true"
        )
    })

    it("só envia período personalizado válido e bloqueia datas futuras", async () => {
        const { user, calls } = await renderReportsPage()
        await screen.findByText("Conversas iniciadas")

        await user.click(screen.getByRole("button", { name: "Personalizado" }))
        const start = screen.getByLabelText("Data inicial")
        const end = screen.getByLabelText("Data final")
        expect(start).toHaveValue("2026-10-08")
        expect(end).toHaveValue("2026-11-06")
        expect(end).toHaveAttribute("max", "2026-11-07")

        await user.clear(start)
        await user.type(start, "2026-11-05")
        await user.clear(end)
        await user.type(end, "2026-11-07")
        await user.click(screen.getByRole("button", { name: "Aplicar período" }))

        await waitFor(() => {
            expect(calls).toHaveLength(2)
            expect(calls[1]?.url.searchParams.get("startDate")).toBe("2026-11-05")
            expect(calls[1]?.url.searchParams.get("endDate")).toBe("2026-11-07")
        })
    })

    it("não consulta a API com intervalo invertido e explica a definição em tooltip", async () => {
        const { user, calls } = await renderReportsPage()
        await screen.findByText("Conversas iniciadas")
        await user.click(screen.getByRole("button", { name: "Personalizado" }))
        await user.clear(screen.getByLabelText("Data inicial"))
        await user.type(screen.getByLabelText("Data inicial"), "2026-11-06")
        await user.clear(screen.getByLabelText("Data final"))
        await user.type(screen.getByLabelText("Data final"), "2026-11-05")

        expect(screen.getByRole("button", { name: "Aplicar período" })).toBeDisabled()
        expect(calls).toHaveLength(1)

        const tooltipButton = screen.getByRole("button", {
            name: "Definição do resultado dos agendamentos"
        })
        await user.click(tooltipButton)
        expect(screen.getByRole("tooltip")).toBeInTheDocument()
        expect(screen.getByRole("tooltip")).toHaveTextContent(
            "O período considera a data do atendimento"
        )
    })

    it("mostra estado de erro e permite tentar novamente", async () => {
        let fail = true
        const { user } = await renderReportsPage(() =>
            fail
                ? { status: 500, body: { error: { code: "INTERNAL_SERVER_ERROR" } } }
                : { status: 200, body: { data: SUMMARY } }
        )

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Não foi possível carregar os relatórios."
        )
        fail = false
        await user.click(screen.getByRole("button", { name: "Tentar novamente" }))
        expect(await screen.findByText("Conversas iniciadas")).toBeInTheDocument()
    })

    it("mostra estado vazio para categorias e perguntas sem uso", async () => {
        await renderReportsPage(() => ({
            status: 200,
            body: {
                data: {
                    ...SUMMARY,
                    topCategories: [],
                    topQuestions: []
                }
            }
        }))

        expect(
            await screen.findByText("Nenhuma categoria escolhida neste período.")
        ).toBeInTheDocument()
        expect(screen.getByText("Nenhuma pergunta escolhida neste período.")).toBeInTheDocument()
    })

    it("anuncia visualmente o desfecho sem horário disponível em destaque", async () => {
        await renderReportsPage()

        const noSlot = await screen.findByText("Sem horário disponível na janela")
        expect(noSlot.closest("li")?.getAttribute("class")).toContain("outcomeWarning")
    })
})
