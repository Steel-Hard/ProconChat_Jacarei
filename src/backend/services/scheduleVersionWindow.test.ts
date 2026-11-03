import { describe, expect, it } from "vitest"
import {
    buildDefaultScheduleConfigView,
    createScheduleStubRepository,
} from "../repositories/mock/scheduleStub.repository"
import { ScheduleConfigView } from "../types/schedule.types"
import { buildScheduleConfigInput } from "./mock/scheduleConfig.builders"
import { createScheduleService } from "./schedule.service"

const MONDAY_EARLY = new Date("2026-10-05T07:00:00-03:00")
const MONDAY_MORNING = new Date("2026-10-05T09:00:00-03:00")

function morningRanges(weekdays: number[]) {
    return weekdays.map((weekday) => ({ weekday, slotIndex: 1, startTime: "08:00", endTime: "10:00" }))
}

function serviceWith(base: ScheduleConfigView, effectiveFrom: string, change: ScheduleConfigView) {
    const repository = createScheduleStubRepository({
        config: base,
        scheduledConfigs: [{ effectiveFrom, config: change }],
    })
    return createScheduleService(repository)
}

describe("ScheduleService com versões: janela e antecedência", () => {
    it("usa a janela da versão vigente hoje mesmo quando a mudança dentro dela tem janela maior", async () => {
        const service = serviceWith(
            buildDefaultScheduleConfigView({ windowDays: 10, minNoticeDays: 0, ranges: morningRanges([1, 2, 3, 4, 5]) }),
            "2026-10-08",
            buildDefaultScheduleConfigView({ windowDays: 60, minNoticeDays: 0, ranges: morningRanges([1, 2, 3, 4, 5]) }),
        )

        const slots = await service.getAvailableSlots(MONDAY_EARLY)

        expect(slots.at(-1)?.dateStr).toBe("2026-10-15")
    })

    it("conta os dias úteis da antecedência com a grade de cada dia", async () => {
        const service = serviceWith(
            buildDefaultScheduleConfigView({ windowDays: 30, minNoticeDays: 2, ranges: morningRanges([1, 2, 3, 4, 5]) }),
            "2026-10-07",
            buildDefaultScheduleConfigView({ windowDays: 30, minNoticeDays: 2, ranges: morningRanges([1, 3, 4, 5]) }),
        )

        const slots = await service.getAvailableSlots(MONDAY_MORNING)

        expect(slots[0]?.dateStr).toBe("2026-10-07")
    })

    it("mostra na prévia a janela, os totais e os dias da semana da versão vigente hoje", async () => {
        const service = serviceWith(
            buildDefaultScheduleConfigView({
                windowDays: 10,
                minNoticeDays: 0,
                seatsPerSlot: 2,
                ranges: morningRanges([1, 2, 3, 4, 5]),
            }),
            "2026-10-08",
            buildDefaultScheduleConfigView({
                windowDays: 60,
                minNoticeDays: 0,
                seatsPerSlot: 4,
                ranges: morningRanges([1, 2, 3, 4, 5]),
            }),
        )

        const preview = await service.getMonthlyPreview({ month: "2026-10", now: MONDAY_EARLY })

        expect({
            windowStart: preview.windowStart,
            windowEnd: preview.windowEnd,
            totalWindowSeats: preview.totalWindowSeats,
            mondaySeats: preview.weekdays[1]?.totalSeats,
            lastDay: preview.days.find((day) => day.date === "2026-10-15")?.status,
            afterWindow: preview.days.find((day) => day.date === "2026-10-16")?.status,
        }).toEqual({
            windowStart: "2026-10-05",
            windowEnd: "2026-10-15",
            totalWindowSeats: 3 * 4 * 2 + 6 * 4 * 4,
            mondaySeats: 8,
            lastDay: "AVAILABLE",
            afterWindow: "OUTSIDE_WINDOW",
        })
    })

    it("mostra na prévia de um rascunho os dias da semana do rascunho", async () => {
        const service = serviceWith(
            buildDefaultScheduleConfigView({ windowDays: 10, minNoticeDays: 0, ranges: morningRanges([1, 2, 3, 4, 5]) }),
            "2026-10-08",
            buildDefaultScheduleConfigView({ windowDays: 10, minNoticeDays: 0, ranges: morningRanges([1, 2, 3, 4, 5]) }),
        )

        const preview = await service.getMonthlyPreview({
            month: "2026-10",
            now: MONDAY_EARLY,
            draftEffectiveFrom: "2026-10-08",
            draftConfig: buildScheduleConfigInput({
                windowDays: 10,
                minNoticeDays: 0,
                seatsPerSlot: 3,
                ranges: [{ weekday: 1, startTime: "08:00", endTime: "09:00" }],
            }),
        })

        expect(preview.weekdays[1]?.totalSeats).toBe(6)
    })
})
