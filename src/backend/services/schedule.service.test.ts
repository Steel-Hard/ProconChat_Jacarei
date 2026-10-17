import { beforeEach, describe, expect, it, vi } from "vitest"
import { IScheduleRepository } from "../repositories/schedule.repository.interface"
import { createScheduleService, IScheduleService } from "./schedule.service"
import {
    buildScheduleSettings,
    fullDayBlock,
    partialBlock,
    weekdayRanges,
} from "./mock/schedule.fixtures"

describe("ScheduleService", () => {
    const defaultSettings = buildScheduleSettings()

    const defaultRanges = weekdayRanges("08:00:00", "10:00:00")

    let repoMock: IScheduleRepository
    let service: IScheduleService

    beforeEach(() => {
        repoMock = {
            getSettings: vi.fn().mockResolvedValue(defaultSettings),
            getRanges: vi.fn().mockResolvedValue(defaultRanges),
            getBlockedDates: vi.fn().mockResolvedValue([]),
            countActiveAppointmentsPerSlot: vi.fn().mockResolvedValue(new Map()),
            bookAppointment: vi.fn(),
        }
        service = createScheduleService(repoMock)
    })

    function distinctDates(slots: { dateStr: string }[]): string[] {
        return Array.from(new Set(slots.map((s) => s.dateStr)))
    }

    it("deve calcular horários livres respeitando a antecedência mínima de 1 dia útil", async () => {
        const now = new Date("2026-10-05T09:00:00-03:00")
        const slots = await service.getAvailableSlots(now)

        expect(slots.length).toBeGreaterThan(0)
        expect(slots.some((s) => s.dateStr === "2026-10-05")).toBe(false)
        expect(slots[0]?.dateStr).toBe("2026-10-06")
        expect(slots[0]?.timeStr).toBe("08:00")
        expect(slots[0]?.formatted).toContain("Terça-feira, 06/10 às 08:00")
    })

    it("conta a antecedência de sexta para segunda pulando o fim de semana", async () => {
        const now = new Date("2026-10-09T09:00:00-03:00")
        const slots = await service.getAvailableSlots(now)

        expect(slots[0]?.dateStr).toBe("2026-10-12")
        expect(slots.some((s) => s.dateStr === "2026-10-09")).toBe(false)
    })

    it("conta a antecedência em dias com atendimento, não em dias corridos, a partir de sexta", async () => {
        vi.mocked(repoMock.getSettings).mockResolvedValueOnce(buildScheduleSettings({ min_notice_days: 2 }))

        const now = new Date("2026-10-09T09:00:00-03:00")
        const slots = await service.getAvailableSlots(now)

        expect(slots[0]?.dateStr).toBe("2026-10-13")
        expect(distinctDates(slots)).not.toContain("2026-10-12")
    })

    it("não conta dia bloqueado dentro do período de antecedência", async () => {
        vi.mocked(repoMock.getSettings).mockResolvedValueOnce(buildScheduleSettings({ min_notice_days: 2 }))
        const blocked = [fullDayBlock("2026-10-06")]
        vi.mocked(repoMock.getBlockedDates).mockResolvedValueOnce(blocked)

        const now = new Date("2026-10-05T09:00:00-03:00")
        const slots = await service.getAvailableSlots(now)

        expect(slots[0]?.dateStr).toBe("2026-10-08")
        expect(distinctDates(slots)).not.toContain("2026-10-06")
        expect(distinctDates(slots)).not.toContain("2026-10-07")
    })

    it("deve oferecer horários no mesmo dia se min_notice_days for 0 e horário for futuro", async () => {
        vi.mocked(repoMock.getSettings).mockResolvedValueOnce(buildScheduleSettings({ min_notice_days: 0 }))

        const now = new Date("2026-10-05T08:15:00-03:00")
        const slots = await service.getAvailableSlots(now)

        const todaySlots = slots.filter((s) => s.dateStr === "2026-10-05")
        expect(todaySlots.length).toBeGreaterThan(0)
        expect(todaySlots[0]?.timeStr).toBe("08:30")
    })

    it("deve ignorar dias inteiros bloqueados em BlockedDates", async () => {
        const blocked = [fullDayBlock("2026-10-06")]
        vi.mocked(repoMock.getBlockedDates).mockResolvedValueOnce(blocked)

        const now = new Date("2026-10-05T09:00:00-03:00")
        const slots = await service.getAvailableSlots(now)

        expect(slots.some((s) => s.dateStr === "2026-10-06")).toBe(false)
        expect(slots[0]?.dateStr).toBe("2026-10-07")
    })

    it("deve filtrar slots que colidem com bloqueios parciais", async () => {
        const blocked = [partialBlock("2026-10-06", "08:30:00", "09:30:00")]
        vi.mocked(repoMock.getBlockedDates).mockResolvedValueOnce(blocked)

        const now = new Date("2026-10-05T09:00:00-03:00")
        const slots = await service.getAvailableSlots(now)

        const times = slots.filter((s) => s.dateStr === "2026-10-06").map((s) => s.timeStr)
        expect(times).toContain("08:00")
        expect(times).not.toContain("08:30")
        expect(times).not.toContain("09:00")
        expect(times).toContain("09:30")
    })

    it("deve excluir slots lotados e diminuir vagas restantes de slots parcialmente ocupados", async () => {
        const activeCounts = new Map<string, number>()
        activeCounts.set(new Date("2026-10-06T08:00:00-03:00").toISOString(), 2)
        activeCounts.set(new Date("2026-10-06T08:30:00-03:00").toISOString(), 1)
        vi.mocked(repoMock.countActiveAppointmentsPerSlot).mockResolvedValueOnce(activeCounts)

        const now = new Date("2026-10-05T09:00:00-03:00")
        const slots = await service.getAvailableSlots(now)

        const tuesdaySlots = slots.filter((s) => s.dateStr === "2026-10-06")
        expect(tuesdaySlots.some((s) => s.timeStr === "08:00")).toBe(false)

        const slot0830 = tuesdaySlots.find((s) => s.timeStr === "08:30")
        expect(slot0830).toBeDefined()
        expect(slot0830?.remainingSeats).toBe(1)
    })

    it("deve retornar array vazio se ScheduleSettings não estiver configurado", async () => {
        vi.mocked(repoMock.getSettings).mockResolvedValueOnce(null)
        const slots = await service.getAvailableSlots()
        expect(slots).toEqual([])
    })

    it("deve respeitar estritamente o limite da janela de agendamento (window_days)", async () => {
        vi.mocked(repoMock.getSettings).mockResolvedValueOnce(
            buildScheduleSettings({ window_days: 2, min_notice_days: 1 }),
        )

        const now = new Date("2026-10-05T09:00:00-03:00")
        const slots = await service.getAvailableSlots(now)

        const dates = distinctDates(slots)
        expect(dates).toContain("2026-10-06")
        expect(dates).toContain("2026-10-07")
        expect(dates).not.toContain("2026-10-08")
        expect(dates).not.toContain("2026-10-09")
    })

    it("não deve entrar em loop infinito se as faixas forem mais curtas que slot_minutes", async () => {
        const shortRanges = weekdayRanges("08:00:00", "08:20:00")
        vi.mocked(repoMock.getRanges).mockResolvedValueOnce(shortRanges)

        const now = new Date("2026-10-05T09:00:00-03:00")
        const slots = await service.getAvailableSlots(now)

        expect(slots).toEqual([])
    })
})
