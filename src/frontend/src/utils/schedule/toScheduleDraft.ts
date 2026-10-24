import type ScheduleConfig from "@/types/schedule/ScheduleConfig.types"
import type ScheduleDraft from "@/types/schedule/ScheduleDraft.types"
import WEEKDAY_ORDER from "@/utils/schedule/weekdayOrder"

function toScheduleDraft(config: ScheduleConfig): ScheduleDraft {
    const days = WEEKDAY_ORDER.map((weekday) => {
        const ranges = config.ranges
            .filter((range) => range.weekday === weekday)
            .map(({ startTime, endTime }) => ({ startTime, endTime }))
            .toSorted((a, b) => a.startTime.localeCompare(b.startTime))

        return { weekday, enabled: ranges.length > 0, ranges }
    })

    return {
        days,
        slotMinutes: config.slotMinutes,
        seatsPerSlot: String(config.seatsPerSlot),
        windowDays: String(config.windowDays),
        minNoticeDays: config.minNoticeDays,
        waitAlertDays: String(config.waitAlertDays),
        unitAddress: config.unitAddress,
        unitAddressComplement: config.unitAddressComplement ?? "",
        reminderEnabled: config.reminderEnabled,
        reminderHours: config.reminderHours,
        blockedDates: config.blockedDates.map((block) => ({ ...block }))
    }
}

export default toScheduleDraft
