import { beforeEach, describe, expect, it, vi } from "vitest"
import type { IScheduleRepository } from "../repositories/schedule.repository.interface"
import type { WeekAppointmentRecord } from "../types/appointment.types"
import { parseLocalDate } from "../utils/date.utils"
import { AppointmentCalendarAppointments, createAppointmentCalendarService } from "./appointmentCalendar.service"
import { buildScheduleSettings, fullDayBlock, partialBlock, weekdayRanges } from "./mock/schedule.fixtures"
import { createScheduleService } from "./schedule.service"

const NOW = new Date("2026-10-20T13:00:00.000Z")

function weekRecord(overrides: Partial<WeekAppointmentRecord> = {}): WeekAppointmentRecord {
    return {
        id: "1",
        protocol: "A1B2C3D4",
        shortName: "Maria",
        appointmentDatetime: parseLocalDate("2026-10-21", "08:30"),
        status: "PENDING",
        assigned_user_id: null,
        off_grid: false,
        ...overrides,
    }
}

describe("appointmentCalendar.service", () => {
    let scheduleRepository: IScheduleRepository
    let appointments: AppointmentCalendarAppointments & { findWeek: ReturnType<typeof vi.fn> }

    function build(weekStartDay?: number) {
        const schedule = createScheduleService(scheduleRepository)
        return {
            schedule,
            calendar: createAppointmentCalendarService({
                schedule,
                scheduleRepository,
                appointments,
                clock: () => NOW,
                ...(weekStartDay === undefined ? {} : { weekStartDay }),
            }),
        }
    }

    beforeEach(() => {
        scheduleRepository = {
            getSettings: vi.fn().mockResolvedValue(buildScheduleSettings()),
            getRanges: vi.fn().mockResolvedValue(weekdayRanges("08:00:00", "10:00:00")),
            getBlockedDates: vi.fn().mockResolvedValue([
                partialBlock("2026-10-22", "08:00:00", "09:00:00"),
                fullDayBlock("2026-10-23"),
            ]),
            countActiveAppointmentsPerSlot: vi
                .fn()
                .mockResolvedValue(new Map([[parseLocalDate("2026-10-21", "08:00").toISOString(), 2]])),
            bookAppointment: vi.fn(),
            getConfig: vi.fn(),
            saveConfig: vi.fn(),
        }
        appointments = { findWeek: vi.fn().mockResolvedValue([]) }
    })

    it("devolve a semana de domingo a sábado que contém a data, só com os dias que têm grade, e o dia inicial", async () => {
        const result = await build().calendar.getCalendar({ date: "2026-10-21" })

        expect(result.weekStart).toBe("2026-10-18")
        expect(result.weekEnd).toBe("2026-10-24")
        expect(result.weekStartDay).toBe(0)
        expect(result.days.map((day) => day.date)).toEqual([
            "2026-10-19",
            "2026-10-20",
            "2026-10-21",
            "2026-10-22",
            "2026-10-23",
        ])
        expect(result.days[0]?.slots.map((slot) => slot.time)).toEqual(["08:00", "08:30", "09:00", "09:30"])
    })

    it("usa outro dia inicial recebido pela fábrica sem mudar mais nada", async () => {
        vi.mocked(scheduleRepository.getRanges).mockResolvedValue(weekdayRanges("08:00:00", "10:00:00", [0, 1]))

        const result = await build(1).calendar.getCalendar({ date: "2026-10-21" })

        expect(result.weekStart).toBe("2026-10-19")
        expect(result.weekEnd).toBe("2026-10-25")
        expect(result.weekStartDay).toBe(1)
        expect(result.days.map((day) => day.date)).toEqual(["2026-10-19", "2026-10-25"])
    })

    it("sem data, usa a semana de hoje em São Paulo", async () => {
        const result = await build().calendar.getCalendar({})

        expect(result.weekStart).toBe("2026-10-18")
    })

    it("freeSeats é igual ao remainingSeats do bot no mesmo instante, e null onde o bot não oferece", async () => {
        const { schedule, calendar } = build()
        const offered = new Map(
            (await schedule.getAvailableSlots(NOW)).map((slot) => [`${slot.dateStr} ${slot.timeStr}`, slot.remainingSeats]),
        )

        const result = await calendar.getCalendar({ date: "2026-10-21" })

        const cells = result.days.flatMap((day) => day.slots.map((slot) => ({ key: `${day.date} ${slot.time}`, freeSeats: slot.freeSeats })))
        expect(cells.length).toBe(20)
        for (const cell of cells) {
            expect(cell.freeSeats).toBe(offered.get(cell.key) ?? null)
        }
        expect(cells.some((cell) => cell.freeSeats !== null)).toBe(true)
    })

    it.each([
        { label: "no passado", key: "2026-10-19 08:00" },
        { label: "lotado", key: "2026-10-21 08:00" },
        { label: "com bloqueio de período", key: "2026-10-22 08:30" },
        { label: "com bloqueio de dia inteiro", key: "2026-10-23 09:00" },
    ])("freeSeats é null no horário $label", async ({ key }) => {
        const result = await build().calendar.getCalendar({ date: "2026-10-21" })

        const [date, time] = key.split(" ")
        const slot = result.days.find((day) => day.date === date)?.slots.find((item) => item.time === time)
        expect(slot).toEqual({ time, freeSeats: null })
    })

    it("freeSeats é null antes da antecedência mínima", async () => {
        vi.mocked(scheduleRepository.getSettings).mockResolvedValue(buildScheduleSettings({ min_notice_days: 2 }))

        const result = await build().calendar.getCalendar({ date: "2026-10-21" })

        expect(result.days.find((day) => day.date === "2026-10-21")?.slots.every((slot) => slot.freeSeats === null)).toBe(true)
        expect(result.days.find((day) => day.date === "2026-10-22")?.slots.some((slot) => slot.freeSeats !== null)).toBe(true)
    })

    it("freeSeats é null fora da janela de agendamento", async () => {
        const result = await build().calendar.getCalendar({ date: "2026-10-28" })

        expect(result.days.find((day) => day.date === "2026-10-27")?.slots.some((slot) => slot.freeSeats !== null)).toBe(true)
        expect(result.days.find((day) => day.date === "2026-10-28")?.slots.every((slot) => slot.freeSeats === null)).toBe(true)
    })

    it("descreve os bloqueios de dia inteiro e de período", async () => {
        const result = await build().calendar.getCalendar({ date: "2026-10-21" })

        expect(result.days.find((day) => day.date === "2026-10-22")?.blocked).toEqual({
            fullDay: false,
            description: null,
            periods: [{ start: "08:00", end: "09:00", description: "Manutenção" }],
        })
        expect(result.days.find((day) => day.date === "2026-10-23")?.blocked).toEqual({
            fullDay: true,
            description: "Feriado Municipal",
            periods: [],
        })
        expect(result.days.find((day) => day.date === "2026-10-21")?.blocked).toEqual({
            fullDay: false,
            description: null,
            periods: [],
        })
        expect(scheduleRepository.getBlockedDates).toHaveBeenCalledWith("2026-10-18", "2026-10-24")
    })

    it("pede ao repositório os agendamentos da semana com os filtros e devolve data e hora locais", async () => {
        appointments.findWeek.mockResolvedValue([
            weekRecord(),
            weekRecord({
                id: "2",
                shortName: "João",
                appointmentDatetime: parseLocalDate("2026-10-22", "08:45"),
                status: "CONFIRMED",
                assigned_user_id: "7",
                off_grid: true,
            }),
        ])

        const result = await build().calendar.getCalendar({
            date: "2026-10-21",
            status: "CONFIRMED",
            responsible: "me",
            currentUserId: 7,
        })

        expect(appointments.findWeek).toHaveBeenCalledWith(
            parseLocalDate("2026-10-18", "00:00"),
            parseLocalDate("2026-10-25", "00:00"),
            { status: "CONFIRMED", responsible: "me", currentUserId: 7 },
            NOW,
        )
        expect(result.appointments).toEqual([
            {
                id: "1",
                protocol: "A1B2C3D4",
                shortName: "Maria",
                date: "2026-10-21",
                time: "08:30",
                status: "PENDING",
                assigned_user_id: null,
                off_grid: false,
            },
            {
                id: "2",
                protocol: "A1B2C3D4",
                shortName: "João",
                date: "2026-10-22",
                time: "08:45",
                status: "CONFIRMED",
                assigned_user_id: "7",
                off_grid: true,
            },
        ])
    })

    it("sem configuração de agenda devolve days vazio e mantém os agendamentos", async () => {
        vi.mocked(scheduleRepository.getSettings).mockResolvedValue(null)
        appointments.findWeek.mockResolvedValue([weekRecord()])

        const result = await build().calendar.getCalendar({ date: "2026-10-21" })

        expect(result.days).toEqual([])
        expect(result.appointments).toHaveLength(1)
    })
})
