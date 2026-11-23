import { describe, expect, it } from "vitest"
import type ScheduleConflictCode from "@/types/schedule/ScheduleConflictCode.types"
import type SchedulePreviewConflict from "@/types/schedule/SchedulePreviewConflict.types"
import conflictTargets from "@/utils/schedule/conflictTargets"

function conflict(code: ScheduleConflictCode, date = "2026-11-04"): SchedulePreviewConflict {
    return { protocol: "A1B2C3D4", date, time: "09:00", status: "PENDING", code, reason: "x" }
}

describe("conflictTargets", () => {
    it.each(["DATE_BLOCKED", "PERIOD_BLOCKED"] as const)("liga %s ao bloqueio da data", (code) => {
        expect(conflictTargets([conflict(code)]).blocks).toEqual({
            "2026-11-04": [conflict(code)]
        })
    })

    it.each(["DAY_WITHOUT_SERVICE", "RANGE_CHANGED"] as const)(
        "liga %s à linha do dia da semana da data",
        (code) => {
            expect(conflictTargets([conflict(code)]).weekdays).toEqual({ 3: [conflict(code)] })
        }
    )

    it.each(["DURATION_CHANGED", "RESPONSIBLE_OVERLAP"] as const)("liga %s à duração", (code) => {
        expect(conflictTargets([conflict(code)]).slotMinutes).toEqual([conflict(code)])
    })

    it("liga SEATS_REDUCED às vagas", () => {
        expect(conflictTargets([conflict("SEATS_REDUCED")]).seatsPerSlot).toEqual([
            conflict("SEATS_REDUCED")
        ])
    })

    it("junta os conflitos do mesmo alvo", () => {
        const first = conflict("RANGE_CHANGED", "2026-11-04")
        const second = conflict("DAY_WITHOUT_SERVICE", "2026-11-11")

        expect(conflictTargets([first, second]).weekdays).toEqual({ 3: [first, second] })
    })
})
