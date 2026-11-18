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
        expect(
            await screen.findByRole("heading", { level: 2, name: "Conversas no período" })
        ).toBeInTheDocument()
    })

    it("carrega e apresenta os totais agregados, desfechos, categorias, perguntas e agendamentos", async () => {
        const { calls } = await renderReportsPage()

        expect(
            await screen.findByRole("heading", { level: 2, name: "Conversas no período" })
        ).toBeInTheDocument()
        expect(screen.getByText("Sem horário disponível na janela")).toBeInTheDocument()
        expect(screen.getAllByText("Consumidor")).toHaveLength(2)
        expect(screen.getByText("Como contestar uma cobrança indevida?")).toBeInTheDocument()
        expect(screen.getByText("Taxa de não comparecimento: 28,6%")).toBeInTheDocument()
        expect(screen.getByText("Total com atendimento no período")).toBeInTheDocument()
        expect(calls).toHaveLength(1)
        expect(calls[0]?.url.searchParams.get("period")).toBe("30d")
    })

    it("consulta novamente ao selecionar um período predefinido", async () => {
        const { user, calls } = await renderReportsPage()
        await screen.findByRole("heading", { level: 2, name: "Conversas no período" })

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

    it("explica a definição em tooltip", async () => {
        const { user } = await renderReportsPage()
        await screen.findByRole("heading", { level: 2, name: "Conversas no período" })

        await user.click(
            screen.getByRole("button", { name: "Definição do resultado dos agendamentos" })
        )

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
        expect(
            await screen.findByRole("heading", { level: 2, name: "Conversas no período" })
        ).toBeInTheDocument()
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
})
