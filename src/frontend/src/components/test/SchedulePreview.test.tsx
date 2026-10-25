import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import SchedulePreview from "@/components/SchedulePreview"
import buildMonthlyPreview from "@/testUtils/buildMonthlyPreview"
import type BookedDay from "@/types/schedule/BookedDay.types"
import type MonthlyPreview from "@/types/schedule/MonthlyPreview.types"

vi.setConfig({ testTimeout: 20000 })

const SLOTS = [
    { time: "08:30", capacity: 2, usedSeats: 0, freeSeats: 2, offered: true, past: false },
    { time: "09:00", capacity: 2, usedSeats: 2, freeSeats: 0, offered: true, past: false },
    { time: "09:30", capacity: 2, usedSeats: 0, freeSeats: 2, offered: false, past: false },
    { time: "10:00", capacity: 2, usedSeats: 1, freeSeats: 1, offered: true, past: false }
]

const PREVIEW = buildMonthlyPreview("2026-11", [
    { date: "2026-11-02", status: "BLOCKED", blockDescription: "Finados" },
    { date: "2026-11-03", status: "AVAILABLE", freeSeats: 7, capacity: 8, slots: SLOTS },
    { date: "2026-11-04", status: "FULL", freeSeats: 0, capacity: 8 },
    { date: "2026-11-05", status: "BEFORE_MIN_NOTICE" },
    { date: "2026-11-06", status: "PAST" },
    { date: "2026-11-07", status: "NO_SERVICE" },
    { date: "2026-11-09", status: "CLOSED_TODAY" },
    { date: "2026-11-10", status: "AVAILABLE", freeSeats: 1, capacity: 8 }
])

const BOOKED: BookedDay[] = [
    {
        date: "2026-11-02",
        weekday: 1,
        total: 3,
        times: [
            { time: "09:00", count: 2 },
            { time: "10:30", count: 1 }
        ]
    },
    { date: "2026-11-07", weekday: 6, total: 1, times: [{ time: "09:00", count: 1 }] }
]

type Props = Partial<Parameters<typeof SchedulePreview>[0]>

function renderPreview(props: Props = {}) {
    const onShiftMonth = vi.fn()
    const onSelectDay = vi.fn()
    render(
        <SchedulePreview
            preview={PREVIEW}
            month={null}
            updating={false}
            bookedDays={[]}
            selectedDate={null}
            loading={false}
            failed={false}
            stale={false}
            onShiftMonth={onShiftMonth}
            onSelectDay={onSelectDay}
            {...props}
        />
    )

    return { onShiftMonth, onSelectDay, user: userEvent.setup() }
}

function grid() {
    return screen.getByText("Dom").parentElement as HTMLElement
}

describe("SchedulePreview", () => {
    it.each([
        ["03/11: 7 vagas livres", "7"],
        ["10/11: 1 vaga livre", "1"],
        ["04/11: Lotado", "Lotado"],
        ["02/11: Bloqueado: Finados", "✕"],
        ["05/11: Antes da antecedência mínima", ""],
        ["06/11: Dia passado", ""],
        ["07/11: Sem atendimento", ""],
        ["09/11: Sem horários restantes hoje", ""],
        ["08/11: Fora da janela de agendamento", ""]
    ])("mostra a célula %s como veio do servidor", (name, mark) => {
        renderPreview()

        const cell = screen.getByRole("button", { name })

        expect(cell).toHaveAttribute("title", name)
        expect(cell.lastElementChild).toHaveTextContent(mark === "" ? /^$/ : mark)
    })

    it("põe o primeiro dia do mês na coluna do dia da semana recebido", () => {
        renderPreview({ preview: buildMonthlyPreview("2026-12") })

        const firstDay = screen.getByRole("button", { name: /^01\/12/ })

        expect(Array.from(grid().children).indexOf(firstDay)).toBe(7 + 2)
    })

    it("marca os dias com agendamento mesmo bloqueados ou sem atendimento", () => {
        renderPreview({ bookedDays: BOOKED })

        expect(
            screen.getByRole("button", { name: "02/11: Bloqueado: Finados · 3 agendamentos" })
        ).toHaveTextContent("3 agend.")
        expect(
            screen.getByRole("button", { name: "07/11: Sem atendimento · 1 agendamento" })
        ).toHaveTextContent("1 agend.")
    })

    it("lista no detalhe os horários com agendamento do dia escolhido", () => {
        renderPreview({ bookedDays: BOOKED, selectedDate: "2026-11-02" })

        expect(
            screen.getByRole("heading", { name: "Segunda-feira, 02/11/2026" })
        ).toBeInTheDocument()
        expect(screen.getByText("Bloqueado · Finados")).toBeInTheDocument()
        expect(screen.getByText("09:00 · 2 agendamentos")).toBeInTheDocument()
        expect(screen.getByText("10:30 · 1 agendamento")).toBeInTheDocument()
    })

    it("chama a escolha do dia ao clicar na célula", async () => {
        const { onSelectDay, user } = renderPreview()

        await user.click(screen.getByRole("button", { name: "04/11: Lotado" }))

        expect(onSelectDay).toHaveBeenCalledWith("2026-11-04")
    })

    it("mostra no detalhe os horários do dia com as vagas livres e os não oferecidos", () => {
        renderPreview({ selectedDate: "2026-11-03" })

        expect(screen.getByRole("heading", { name: "Terça-feira, 03/11/2026" })).toBeInTheDocument()
        expect(screen.getByText("Oferecido pelo chatbot")).toBeInTheDocument()
        expect(screen.getByText("2 de 2 livres")).toBeInTheDocument()
        expect(
            screen.getByText("Lotado", { selector: "span:not([aria-hidden])" })
        ).toBeInTheDocument()
        expect(screen.getByText("2 de 2 livres · não oferecido")).toBeInTheDocument()
        expect(screen.getByText("1 de 2 livre")).toBeInTheDocument()
    })

    it("escolhe o primeiro dia com vagas quando nenhum dia foi escolhido", () => {
        renderPreview()

        expect(screen.getByRole("heading", { name: "Terça-feira, 03/11/2026" })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "03/11: 7 vagas livres" })).toHaveAttribute(
            "aria-pressed",
            "true"
        )
    })

    it.each([
        ["2026-11-06", "Dia passado"],
        ["2026-11-09", "Sem horários restantes hoje"]
    ])("explica no detalhe o dia %s", (selectedDate, text) => {
        renderPreview({ selectedDate })

        expect(screen.getByText(text, { selector: "span" })).toBeInTheDocument()
        expect(screen.getByText("Nenhum horário configurado para este dia.")).toBeInTheDocument()
    })

    it.each([
        ["Mês anterior", -1],
        ["Próximo mês", 1]
    ])("pede um mês a mais ou a menos ao clicar em %s", async (name, delta) => {
        const { onShiftMonth, user } = renderPreview()

        await user.click(screen.getByRole("button", { name }))
        await user.click(screen.getByRole("button", { name }))

        expect(onShiftMonth.mock.calls).toEqual([[delta], [delta]])
    })

    it("mostra no título o mês pedido, mesmo antes de a prévia dele chegar", () => {
        renderPreview({ preview: buildMonthlyPreview("2026-12"), month: "2027-01", updating: true })

        expect(screen.getByText("Janeiro de 2027")).toBeInTheDocument()
        expect(screen.queryByText("Dezembro de 2026")).not.toBeInTheDocument()
    })

    it("mostra que está atualizando e marca a prévia exibida como ocupada", () => {
        renderPreview({ updating: true })

        expect(screen.getByRole("status")).toHaveTextContent("Atualizando a prévia...")
        expect(
            screen.getByRole("heading", { name: "Prévia da grade" }).closest("section")
        ).toHaveAttribute("aria-busy", "true")
    })

    it("não mostra o aviso de atualização com a prévia em dia", () => {
        renderPreview()

        expect(screen.queryByRole("status")).not.toBeInTheDocument()
        expect(
            screen.getByRole("heading", { name: "Prévia da grade" }).closest("section")
        ).not.toHaveAttribute("aria-busy")
    })

    it("mostra o total de vagas na janela e os horários por dia da semana", () => {
        renderPreview()

        expect(screen.getByText("236 de 240 vagas livres na janela")).toBeInTheDocument()
        expect(screen.getByText(/de 27\/10\/2026 a 23\/11\/2026/)).toBeInTheDocument()
        const weekdays = screen.getByRole("heading", { name: "Horários por dia da semana" })
            .parentElement as HTMLElement
        expect(within(weekdays).getAllByText("2 horários · 4 vagas · 08:30, 09:00")).toHaveLength(5)
        expect(within(weekdays).getAllByText("Sem atendimento")).toHaveLength(2)
    })

    it.each([
        ["Lotado", "04/11: Lotado"],
        ["Bloqueado (✕)", "02/11: Bloqueado: Finados"],
        ["Com vagas (número = vagas livres)", "03/11: 7 vagas livres"]
    ])("pinta a legenda %s com a mesma cor da célula", (legend, cellName) => {
        renderPreview()

        const swatch = screen
            .getByText(legend, { selector: "li" })
            .querySelector("i") as HTMLElement
        const cell = screen.getByRole("button", { name: cellName })

        expect(swatch.style.background).toBe(cell.style.background)
        expect(swatch.style.borderColor).toBe(cell.style.borderColor)
    })

    it("mostra o período da janela com o ano quando ele cruza a virada do ano", () => {
        renderPreview({
            preview: buildMonthlyPreview("2026-11", [], {
                windowStart: "2026-10-26",
                windowEnd: "2027-04-22"
            })
        })

        expect(screen.getByText(/de 26\/10\/2026 a 22\/04\/2027/)).toBeInTheDocument()
    })

    it("mostra o aviso de prévia desatualizada e mantém o calendário", () => {
        renderPreview({ stale: true })

        expect(
            screen.getByText("Corrija os campos com erro para atualizar a prévia.")
        ).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "04/11: Lotado" })).toBeInTheDocument()
    })

    it("mostra o carregamento e a falha só no bloco da prévia", () => {
        const empty: MonthlyPreview | null = null

        renderPreview({ preview: empty, loading: true, failed: true })

        expect(screen.getByText("Carregando a prévia...")).toBeInTheDocument()
        expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar a prévia.")
        expect(screen.queryByRole("button", { name: "Próximo mês" })).not.toBeInTheDocument()
    })
})
