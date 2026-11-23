import type ScheduleChangeKey from "@/types/schedule/ScheduleChangeKey.types"
import type ScheduleConfig from "@/types/schedule/ScheduleConfig.types"
import type ScheduleConfigInput from "@/types/schedule/ScheduleConfigInput.types"
import type ScheduleDraft from "@/types/schedule/ScheduleDraft.types"
import toScheduleDraft from "@/utils/schedule/toScheduleDraft"
import toScheduleInput from "@/utils/schedule/toScheduleInput"

const SOURCES: [ScheduleChangeKey, keyof ScheduleConfigInput][] = [
    ["weeklyGrid", "ranges"],
    ["slotMinutes", "slotMinutes"],
    ["seatsPerSlot", "seatsPerSlot"],
    ["windowDays", "windowDays"],
    ["minNoticeDays", "minNoticeDays"],
    ["waitAlertDays", "waitAlertDays"],
    ["blockedDates", "blockedDates"],
    ["unitAddress", "unitAddress"],
    ["unitAddressComplement", "unitAddressComplement"],
    ["reminderEnabled", "reminderEnabled"],
    ["reminderHours", "reminderHours"]
]

function scheduleChanges(draft: ScheduleDraft, saved: ScheduleConfig): ScheduleChangeKey[] {
    const current = toScheduleInput(draft).input
    const original = toScheduleInput(toScheduleDraft(saved)).input

    return SOURCES.filter(
        ([, field]) => JSON.stringify(current[field]) !== JSON.stringify(original[field])
    ).map(([key]) => key)
}

export default scheduleChanges
