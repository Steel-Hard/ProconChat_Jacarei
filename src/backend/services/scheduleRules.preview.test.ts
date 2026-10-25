import { describe, expect, it } from "vitest"
import { MonthlyGridPreview } from "../types/schedule.types"
import { calculateMonthlyPreview, CalculateMonthlyPreviewInput } from "./scheduleRules"

const NOW = new Date("2026-10-05T09:00:00-03:00")

function weekdayRange(startTime: string, endTime: string) {
    return [1, 2, 3, 4, 5].map((weekday) => ({
        weekday,
        slot_index: 1,
        start_time: startTime,
        end_time: endTime,
    }))
}

function preview(overrides: Partial<CalculateMonthlyPreviewInput> = {}): MonthlyGridPreview {
    return calculateMonthlyPreview({
        month: "2026-10",
        now: NOW,
        settings: {
            slot_minutes: 60,
            seats_per_slot: 2,
            window_days: 5,
            min_notice_days: 1,
        },
        ranges: weekdayRange("08:00", "09:00"),
        blockedDates: [
            {
                date: "2026-10-08",
                start_time: null,
                end_time: null,
                description: "Feriado",
            },
        ],
        activeCounts: new Map<string, number>([
            [new Date("2026-10-07T08:00:00-03:00").toISOString(), 2],
        ]),
        ...overrides,
    })
}

function statusOf(result: MonthlyGridPreview, date: string) {
    return result.days.find((d) => d.date === date)?.status
}

describe("calculateMonthlyPreview", () => {
    it("marca PAST os dias antes de hoje", () => {
        const result = preview()

        expect(statusOf(result, "2026-10-01")).toBe("PAST")
        expect(statusOf(result, "2026-10-04")).toBe("PAST")
    })

    it("marca BEFORE_MIN_NOTICE o dia com atendimento antes da antecedência mínima", () => {
        const result = preview()

        expect(statusOf(result, "2026-10-05")).toBe("BEFORE_MIN_NOTICE")
    })

    it("marca BLOCKED o dia com bloqueio inteiro", () => {
        const result = preview()

        expect(statusOf(result, "2026-10-08")).toBe("BLOCKED")
    })

    it("marca NO_SERVICE o dia sem faixas de atendimento", () => {
        const result = preview()

        expect(statusOf(result, "2026-10-10")).toBe("NO_SERVICE")
    })

    it("marca AVAILABLE o dia da janela com vaga livre", () => {
        const result = preview()

        expect(statusOf(result, "2026-10-06")).toBe("AVAILABLE")
    })

    it("marca FULL o dia da janela sem vaga livre", () => {
        const result = preview()

        expect(statusOf(result, "2026-10-07")).toBe("FULL")
    })

    it("marca OUTSIDE_WINDOW o dia depois do fim da janela", () => {
        const result = preview()

        expect(statusOf(result, "2026-10-15")).toBe("OUTSIDE_WINDOW")
    })

    it("marca CLOSED_TODAY o dia de hoje quando a antecedência é zero e todos os horários já passaram", () => {
        const result = preview({
            settings: { slot_minutes: 60, seats_per_slot: 2, window_days: 5, min_notice_days: 0 },
        })

        expect(result.windowStart).toBe("2026-10-05")
        expect(statusOf(result, "2026-10-05")).toBe("CLOSED_TODAY")
    })

    it("começa a janela hoje e marca hoje AVAILABLE quando a antecedência é zero e ainda há horário depois de agora", () => {
        const result = preview({
            settings: { slot_minutes: 60, seats_per_slot: 2, window_days: 5, min_notice_days: 0 },
            ranges: weekdayRange("08:00", "12:00"),
        })

        expect(result.windowStart).toBe("2026-10-05")
        expect(statusOf(result, "2026-10-05")).toBe("AVAILABLE")
    })

    it("marca NO_SERVICE todos os dias da janela a partir de hoje e zera os horários da janela quando não há faixas", () => {
        const result = preview({ ranges: [], blockedDates: [], activeCounts: new Map() })

        const inWindow = result.days.filter((d) => d.date >= "2026-10-05" && d.date <= "2026-10-10")
        const afterWindow = result.days.filter((d) => d.date > "2026-10-10")
        expect(result.windowEnd).toBe("2026-10-10")
        expect(inWindow.map((d) => d.status)).toEqual(Array(6).fill("NO_SERVICE"))
        expect(afterWindow.every((d) => d.status === "OUTSIDE_WINDOW")).toBe(true)
        expect(result.totalWindowSlots).toBe(0)
    })
})
