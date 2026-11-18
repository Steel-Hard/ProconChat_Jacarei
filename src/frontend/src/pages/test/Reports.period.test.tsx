import { screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import buildReportsSummary from "@/testUtils/buildReportsSummary"
import renderReportsPage from "@/testUtils/renderReportsPage"

vi.setConfig({ testTimeout: 30000 })

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("Reports: cabeçalho e período", () => {
    it("mostra o título, o subtítulo com o período efetivo e hoje até agora quando o fim é hoje", async () => {
        const summary = buildReportsSummary({
            period: {
                preset: "30d",
                startDate: "2026-10-09",
                endDate: "2026-11-07",
                daysCount: 30,
                today: "2026-11-07"
            }
        })
        const page = await renderReportsPage({ summary })
        await page.loaded()

        expect(screen.getByRole("heading", { level: 1, name: "Relatórios" })).toBeInTheDocument()
        expect(
            screen.getByText(
                "Uso do chatbot e dos agendamentos presenciais · 09/10 a 07/11/2026 (hoje até agora)"
            )
        ).toBeInTheDocument()
    })

    it("mostra o subtítulo sem sufixo quando o fim é anterior a hoje", async () => {
        const page = await renderReportsPage()
        await page.loaded()

        expect(
            screen.getByText("Uso do chatbot e dos agendamentos presenciais · 08/10 a 06/11/2026")
        ).toBeInTheDocument()
    })

    it("mostra os seis chips na ordem, com aria-pressed e o de 30 dias ativo", async () => {
        const page = await renderReportsPage()
        await page.loaded()

        const group = screen.getByRole("group", { name: "Período" })
        const chips = within(group).getAllByRole("button")

        expect(chips.map((chip) => chip.textContent)).toEqual([
            "Últimos 7 dias",
            "Últimos 30 dias",
            "Últimos 90 dias",
            "Mês atual",
            "Mês anterior",
            "Personalizado"
        ])
        expect(chips.map((chip) => chip.getAttribute("aria-pressed"))).toEqual([
            "false",
            "true",
            "false",
            "false",
            "false",
            "false"
        ])
    })

    it("consulta de novo ao escolher um período predefinido", async () => {
        const page = await renderReportsPage()
        await page.loaded()

        await page.user.click(screen.getByRole("button", { name: "Últimos 7 dias" }))

        await waitFor(() => expect(page.requests()).toHaveLength(2))
        expect(page.requests()[1]?.url.searchParams.get("period")).toBe("7d")
        expect(screen.getByRole("button", { name: "Últimos 7 dias" })).toHaveAttribute(
            "aria-pressed",
            "true"
        )
    })

    it("não tem botão Aplicar período nem rótulos Data inicial e Data final", async () => {
        const page = await renderReportsPage()
        await page.loaded()
        await page.user.click(screen.getByRole("button", { name: "Personalizado" }))

        expect(screen.queryByRole("button", { name: "Aplicar período" })).toBeNull()
        expect(screen.queryByText("Data inicial")).toBeNull()
        expect(screen.queryByText("Data final")).toBeNull()
        expect(screen.getByLabelText("De")).toBeInTheDocument()
        expect(screen.getByLabelText("até")).toBeInTheDocument()
    })

    it("pré-preenche as datas com o período da tela, sem consultar de novo, e limita ao dia de hoje", async () => {
        const page = await renderReportsPage()
        await page.loaded()

        await page.user.click(screen.getByRole("button", { name: "Personalizado" }))

        expect(screen.getByLabelText("De")).toHaveValue("2026-10-08")
        expect(screen.getByLabelText("até")).toHaveValue("2026-11-06")
        expect(screen.getByLabelText("De")).toHaveAttribute("max", "2026-11-07")
        expect(screen.getByLabelText("até")).toHaveAttribute("max", "2026-11-07")
        expect(page.requests()).toHaveLength(1)
    })

    it("consulta na hora ao mudar a data para um intervalo válido", async () => {
        const page = await renderReportsPage()
        await page.loaded()
        await page.user.click(screen.getByRole("button", { name: "Personalizado" }))

        await page.user.clear(screen.getByLabelText("De"))
        await page.user.type(screen.getByLabelText("De"), "2026-11-02")

        await waitFor(() => expect(page.requests().length).toBeGreaterThan(1))
        const last = page.requests().at(-1)?.url.searchParams
        expect(last?.get("period")).toBe("custom")
        expect(last?.get("startDate")).toBe("2026-11-02")
        expect(last?.get("endDate")).toBe("2026-11-06")
    })

    it("não consulta ao apagar uma data e mantém o relatório", async () => {
        const page = await renderReportsPage()
        await page.loaded()
        await page.user.click(screen.getByRole("button", { name: "Personalizado" }))

        await page.user.clear(screen.getByLabelText("até"))

        expect(page.requests()).toHaveLength(1)
        expect(
            screen.getByRole("heading", { level: 2, name: "Desfecho das conversas" })
        ).toBeInTheDocument()
    })

    it("usa hoje como data final quando a data digitada é futura", async () => {
        const page = await renderReportsPage()
        await page.loaded()
        await page.user.click(screen.getByRole("button", { name: "Personalizado" }))

        await page.user.clear(screen.getByLabelText("até"))
        await page.user.type(screen.getByLabelText("até"), "2026-12-25")

        await waitFor(() => expect(page.requests().length).toBeGreaterThan(1))
        expect(page.requests().at(-1)?.url.searchParams.get("endDate")).toBe("2026-11-07")
    })

    it("troca as datas quando o início passa do fim", async () => {
        const page = await renderReportsPage()
        await page.loaded()
        await page.user.click(screen.getByRole("button", { name: "Personalizado" }))

        await page.user.clear(screen.getByLabelText("De"))
        await page.user.type(screen.getByLabelText("De"), "2026-11-06")
        await page.user.clear(screen.getByLabelText("até"))
        await page.user.type(screen.getByLabelText("até"), "2026-11-03")

        await waitFor(() => {
            const last = page.requests().at(-1)?.url.searchParams
            expect(last?.get("startDate")).toBe("2026-11-03")
            expect(last?.get("endDate")).toBe("2026-11-06")
        })
    })
})
