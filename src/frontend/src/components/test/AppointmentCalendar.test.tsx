import { render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import AppointmentCalendar from "@/components/AppointmentCalendar"
import type AppointmentCalendarData from "@/types/appointments/AppointmentCalendar.types"

type Day = AppointmentCalendarData["days"][number]
type Item = AppointmentCalendarData["appointments"][number]

function day(date: string, slots: Day["slots"], overrides: Partial<Day> = {}): Day {
    return {
        date,
        seatsPerSlot: 2,
        blocked: { fullDay: false, description: null, periods: [] },
        slots,
        ...overrides
    }
}

function item(overrides: Partial<Item> = {}): Item {
    return {
        id: "11",
        protocol: "AG-0011",
        shortName: "Maria",
        date: "2026-10-19",
        time: "09:00",
        status: "PENDING",
        assigned_user_id: null,
        off_grid: false,
        ...overrides
    }
}

function calendar(days: Day[], appointments: Item[] = []): AppointmentCalendarData {
    return { weekStart: "2026-10-18", weekEnd: "2026-10-24", weekStartDay: 0, days, appointments }
}

function cellsOf(hour: string): HTMLElement[] {
    const row = screen.getByRole("rowheader", { name: hour }).closest("tr")

    if (!row) {
        throw new Error(`linha ${hour} não encontrada`)
    }

    return within(row).getAllByRole("cell")
}

function renderCalendar(data: AppointmentCalendarData) {
    const handlers = {
        onPrevious: vi.fn(),
        onNext: vi.fn(),
        onCurrent: vi.fn(),
        onOpen: vi.fn()
    }

    render(<AppointmentCalendar data={data} {...handlers} />)

    return handlers
}

describe("AppointmentCalendar", () => {
    it("mostra o aviso e nenhuma tabela quando a semana não tem dias nem agendamentos", () => {
        renderCalendar(calendar([]))

        expect(
            screen.getByText("Não há horários configurados para esta semana.")
        ).toBeInTheDocument()
        expect(screen.queryByRole("table")).toBeNull()
    })

    it("monta as colunas com os dias da grade e os dias dos agendamentos, em ordem", () => {
        renderCalendar(
            calendar(
                [day("2026-10-21", [{ time: "09:00", freeSeats: 2 }]), day("2026-10-19", [])],
                [item({ date: "2026-10-23", time: "09:00" })]
            )
        )

        const headers = screen.getAllByRole("columnheader").map((header) => header.textContent)

        expect(headers).toHaveLength(3)
        expect(headers[0]).toMatch(/^Seg 19\/10/)
        expect(headers[1]).toMatch(/^Qua 21\/10/)
        expect(headers[2]).toMatch(/^Sex 23\/10/)
    })

    it("monta as linhas com os horários da grade e a hora de cada agendamento, sem repetir", () => {
        renderCalendar(
            calendar(
                [
                    day("2026-10-19", [
                        { time: "09:00", freeSeats: 2 },
                        { time: "08:00", freeSeats: 2 }
                    ]),
                    day("2026-10-21", [
                        { time: "09:00", freeSeats: 2 },
                        { time: "10:00", freeSeats: 2 }
                    ])
                ],
                [item({ date: "2026-10-21", time: "09:30" })]
            )
        )

        const hours = screen.getAllByRole("rowheader").map((header) => header.textContent)

        expect(hours).toEqual(["08:00", "09:00", "09:30", "10:00"])
    })

    it("põe o cartão do agendamento só na célula da hora e do dia dele", () => {
        renderCalendar(
            calendar(
                [
                    day("2026-10-19", [{ time: "09:00", freeSeats: 2 }]),
                    day("2026-10-21", [{ time: "09:00", freeSeats: 2 }])
                ],
                [item({ date: "2026-10-21", time: "09:30" })]
            )
        )

        const [monday, wednesday] = cellsOf("09:30")

        expect(screen.getAllByText("AG-0011")).toHaveLength(1)
        expect(within(wednesday).getByText("AG-0011")).toBeInTheDocument()
        expect(within(monday).queryByText("AG-0011")).toBeNull()
    })

    it("escreve as vagas livres no singular e no plural", () => {
        renderCalendar(
            calendar([
                day("2026-10-19", [
                    { time: "08:00", freeSeats: 1 },
                    { time: "09:00", freeSeats: 2 }
                ])
            ])
        )

        expect(cellsOf("08:00")[0]).toHaveTextContent(/^1 vaga livre$/)
        expect(cellsOf("09:00")[0]).toHaveTextContent(/^2 vagas livres$/)
        expect(screen.queryByText(/\(s\)/)).toBeNull()
    })

    it("não escreve vagas no horário sem vaga ofertável nem no horário que o dia não tem", () => {
        renderCalendar(
            calendar([
                day("2026-10-19", [{ time: "08:00", freeSeats: null }]),
                day("2026-10-20", [{ time: "09:00", freeSeats: 2 }])
            ])
        )

        const [mondayAtEight] = cellsOf("08:00")
        const [mondayAtNine] = cellsOf("09:00")

        expect(mondayAtEight).not.toHaveTextContent(/vaga/)
        expect(mondayAtNine).not.toHaveTextContent(/vaga/)
    })
})
