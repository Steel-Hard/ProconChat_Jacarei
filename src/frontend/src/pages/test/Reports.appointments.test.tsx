import { screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import APPOINTMENT_STATUS from "@/status/appointmentStatusStyles"
import buildReportsSummary from "@/testUtils/buildReportsSummary"
import renderReportsPage from "@/testUtils/renderReportsPage"

vi.setConfig({ testTimeout: 30000 })

const ROWS = [
    "Atendido",
    "Não compareceu",
    "Cancelado",
    "Aguardando registro (horário já passou)",
    "Pendente ou Confirmado (ainda futuro)"
]

function card(): HTMLElement {
    return screen
        .getByRole("heading", { level: 2, name: "Resultado dos agendamentos" })
        .closest("section") as HTMLElement
}

function row(label: string): HTMLElement {
    return within(card()).getByText(label).closest("li") as HTMLElement
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("Reports: Resultado dos agendamentos", () => {
    it("mostra a taxa de não comparecimento com uma casa e o detalhe", async () => {
        const page = await renderReportsPage()
        await page.loaded()

        const scope = within(card())

        expect(scope.getByText("Taxa de não comparecimento")).toBeInTheDocument()
        expect(scope.getByText("28,6%")).toBeInTheDocument()
        expect(
            scope.getByText(
                "2 não compareceram de 7 agendamentos já registrados (Atendido ou Não compareceu)."
            )
        ).toBeInTheDocument()
    })

    it("pinta o cartão da taxa com as cores de Não compareceu", async () => {
        const page = await renderReportsPage()
        await page.loaded()

        const rate = within(card())
            .getByText("Taxa de não comparecimento")
            .closest("div") as HTMLElement

        expect(rate).toHaveStyle({
            backgroundColor: APPOINTMENT_STATUS.NO_SHOW.bg,
            borderColor: APPOINTMENT_STATUS.NO_SHOW.border
        })
    })

    it("com nenhum registro mostra 0,0% e o detalhe com zeros", async () => {
        const base = buildReportsSummary()
        const page = await renderReportsPage({
            summary: {
                ...base,
                appointmentsResult: {
                    attended: 0,
                    noShow: 0,
                    canceled: 0,
                    waitingRecord: 0,
                    upcoming: 0,
                    total: 0,
                    recordedTotal: 0,
                    noShowRate: 0
                }
            }
        })
        await page.loaded()

        const scope = within(card())

        expect(scope.getByText("0,0%")).toBeInTheDocument()
        expect(
            scope.getByText(
                "0 não compareceram de 0 agendamentos já registrados (Atendido ou Não compareceu)."
            )
        ).toBeInTheDocument()
    })

    it("lista as cinco linhas na ordem, com quantidade e percentual do total", async () => {
        const page = await renderReportsPage()
        await page.loaded()

        const items = within(card()).getAllByRole("listitem")

        expect(items).toHaveLength(5)
        expect(
            items.map((item) => ROWS.find((label) => item.textContent?.includes(label)))
        ).toEqual(ROWS)
        expect(row("Atendido")).toHaveTextContent("5 · 45,5%")
        expect(row("Não compareceu")).toHaveTextContent("2 · 18,2%")
        expect(row("Cancelado")).toHaveTextContent("1 · 9,1%")
        expect(row("Aguardando registro (horário já passou)")).toHaveTextContent("1 · 9,1%")
        expect(row("Pendente ou Confirmado (ainda futuro)")).toHaveTextContent("2 · 18,2%")
    })

    it("pinta as pílulas com as cores dos status", async () => {
        const page = await renderReportsPage()
        await page.loaded()

        const attended = within(row("Atendido")).getByText("Atendido")
        const noShow = within(row("Não compareceu")).getByText("Não compareceu")
        const canceled = within(row("Cancelado")).getByText("Cancelado")
        const upcoming = within(row("Pendente ou Confirmado (ainda futuro)")).getByText(
            "Pendente ou Confirmado (ainda futuro)"
        )

        expect(attended).toHaveStyle({
            backgroundColor: APPOINTMENT_STATUS.ATTENDED.bg,
            color: APPOINTMENT_STATUS.ATTENDED.fg
        })
        expect(noShow).toHaveStyle({
            backgroundColor: APPOINTMENT_STATUS.NO_SHOW.bg,
            color: APPOINTMENT_STATUS.NO_SHOW.fg
        })
        expect(canceled).toHaveStyle({
            backgroundColor: APPOINTMENT_STATUS.CANCELED.bg,
            color: APPOINTMENT_STATUS.CANCELED.fg
        })
        expect(upcoming).toHaveStyle({
            backgroundColor: APPOINTMENT_STATUS.CONFIRMED.bg,
            color: APPOINTMENT_STATUS.CONFIRMED.fg
        })
    })

    it("usa o aviso âmbar por token para Aguardando registro", async () => {
        const page = await renderReportsPage()
        await page.loaded()

        const waiting = within(row("Aguardando registro (horário já passou)")).getByText(
            "Aguardando registro (horário já passou)"
        )

        expect(waiting.className).toContain("pillWaiting")
    })

    it("mostra o total no rodapé", async () => {
        const page = await renderReportsPage()
        await page.loaded()

        const footer = within(card()).getByText("Total com atendimento no período").parentElement

        expect(footer).toHaveTextContent("11")
    })

    it("mostra as linhas com zero e 0,0% quando não há agendamentos", async () => {
        const base = buildReportsSummary()
        const page = await renderReportsPage({
            summary: {
                ...base,
                appointmentsResult: {
                    attended: 0,
                    noShow: 0,
                    canceled: 0,
                    waitingRecord: 0,
                    upcoming: 0,
                    total: 0,
                    recordedTotal: 0,
                    noShowRate: 0
                }
            }
        })
        await page.loaded()

        expect(row("Atendido")).toHaveTextContent("0 · 0,0%")
    })

    it("explica o cartão e a taxa em tooltips", async () => {
        const page = await renderReportsPage()
        await page.loaded()

        await page.user.click(
            screen.getByRole("button", { name: "Definição do resultado dos agendamentos" })
        )
        expect(screen.getByRole("tooltip")).toHaveTextContent(
            "Situação atual dos agendamentos cuja data do atendimento está no período selecionado, independentemente de quando foram criados."
        )

        await page.user.click(
            screen.getByRole("button", { name: "Definição da taxa de não comparecimento" })
        )
        expect(screen.getByRole("tooltip")).toHaveTextContent(
            "Não compareceu dividido por (Atendido + Não compareceu), entre os agendamentos com atendimento no período. Cancelados, aguardando registro e futuros não entram na conta."
        )
    })
})
