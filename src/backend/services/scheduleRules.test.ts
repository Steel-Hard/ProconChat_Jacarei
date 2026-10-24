import { describe, expect, it } from "vitest"
import { calculateMonthlyPreview } from "./scheduleRules"

describe("scheduleRules", () => {
    describe("calculateMonthlyPreview", () => {
        it("classifica corretamente os dias do mês (PAST, BEFORE_MIN_NOTICE, BLOCKED, NO_SERVICE, AVAILABLE, FULL, OUTSIDE_WINDOW)", () => {
            const now = new Date("2026-10-05T09:00:00-03:00")
            const activeCounts = new Map<string, number>([
                [new Date("2026-10-07T08:00:00-03:00").toISOString(), 2],
            ])

            const preview = calculateMonthlyPreview({
                month: "2026-10",
                now,
                settings: {
                    slot_minutes: 60,
                    seats_per_slot: 2,
                    window_days: 5,
                    min_notice_days: 1,
                },
                ranges: [1, 2, 3, 4, 5].map((weekday) => ({
                    weekday,
                    slot_index: 1,
                    start_time: "08:00",
                    end_time: "09:00",
                })),
                blockedDates: [
                    {
                        date: "2026-10-08",
                        start_time: null,
                        end_time: null,
                        description: "Feriado",
                    },
                ],
                activeCounts,
            })

            const statusByDate = new Map(preview.days.map((d) => [d.date, d.status]))

            expect(statusByDate.get("2026-10-01")).toBe("PAST")
            expect(statusByDate.get("2026-10-04")).toBe("PAST")
            expect(statusByDate.get("2026-10-05")).toBe("BEFORE_MIN_NOTICE")
            expect(statusByDate.get("2026-10-06")).toBe("AVAILABLE")
            expect(statusByDate.get("2026-10-07")).toBe("FULL")
            expect(statusByDate.get("2026-10-08")).toBe("BLOCKED")
            expect(statusByDate.get("2026-10-10")).toBe("NO_SERVICE")
            expect(statusByDate.get("2026-10-15")).toBe("OUTSIDE_WINDOW")
        })
    })
})
