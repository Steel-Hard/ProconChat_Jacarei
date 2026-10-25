import type ScheduleConflictTarget from "@/types/schedule/ScheduleConflictTarget.types"
import type SchedulePreviewConflict from "@/types/schedule/SchedulePreviewConflict.types"
import weekdayOfDate from "@/utils/schedule/weekdayOfDate"

function conflictTargets(conflicts: SchedulePreviewConflict[]): ScheduleConflictTarget {
    const target: ScheduleConflictTarget = {
        blocks: {},
        weekdays: {},
        slotMinutes: [],
        seatsPerSlot: []
    }

    for (const conflict of conflicts) {
        if (conflict.code === "DATE_BLOCKED" || conflict.code === "PERIOD_BLOCKED") {
            target.blocks[conflict.date] = [...(target.blocks[conflict.date] ?? []), conflict]
        } else if (conflict.code === "DAY_WITHOUT_SERVICE" || conflict.code === "RANGE_CHANGED") {
            const weekday = weekdayOfDate(conflict.date)
            target.weekdays[weekday] = [...(target.weekdays[weekday] ?? []), conflict]
        } else if (conflict.code === "SEATS_REDUCED") {
            target.seatsPerSlot.push(conflict)
        } else {
            target.slotMinutes.push(conflict)
        }
    }

    return target
}

export default conflictTargets
