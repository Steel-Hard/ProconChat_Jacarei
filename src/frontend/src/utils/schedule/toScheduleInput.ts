import type ScheduleDraft from "@/types/schedule/ScheduleDraft.types"
import type ScheduleInputWithOrigins from "@/types/schedule/ScheduleInputWithOrigins.types"
import numberOfText from "@/utils/schedule/numberOfText"

function toScheduleInput(draft: ScheduleDraft): ScheduleInputWithOrigins {
    const rangeOrigins: ScheduleInputWithOrigins["rangeOrigins"] = []
    const ranges: ScheduleInputWithOrigins["input"]["ranges"] = []

    for (const day of draft.days) {
        if (!day.enabled) {
            continue
        }

        const ordered = day.ranges
            .map((range, rangeIndex) => ({ range, rangeIndex }))
            .toSorted((a, b) => a.range.startTime.localeCompare(b.range.startTime))

        for (const { range, rangeIndex } of ordered) {
            ranges.push({
                weekday: day.weekday,
                startTime: range.startTime,
                endTime: range.endTime
            })
            rangeOrigins.push({ weekday: day.weekday, rangeIndex })
        }
    }

    const complement = draft.unitAddressComplement.trim()

    return {
        input: {
            slotMinutes: draft.slotMinutes,
            seatsPerSlot: numberOfText(draft.seatsPerSlot) ?? Number.NaN,
            windowDays: numberOfText(draft.windowDays) ?? Number.NaN,
            minNoticeDays: draft.minNoticeDays,
            waitAlertDays: numberOfText(draft.waitAlertDays) ?? Number.NaN,
            unitAddress: draft.unitAddress.trim(),
            unitAddressComplement: complement === "" ? null : complement,
            reminderEnabled: draft.reminderEnabled,
            reminderHours: draft.reminderHours,
            ranges,
            blockedDates: draft.blockedDates.map((block) => ({
                date: block.date,
                startTime: block.startTime,
                endTime: block.endTime,
                description: block.description
            }))
        },
        rangeOrigins,
        blockOrigins: draft.blockedDates.map((_, index) => index)
    }
}

export default toScheduleInput
