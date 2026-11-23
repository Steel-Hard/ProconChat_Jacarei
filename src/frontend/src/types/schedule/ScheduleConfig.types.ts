import type BlockedDate from "@/types/schedule/BlockedDate.types"
import type MinNoticeDays from "@/types/schedule/MinNoticeDays.types"
import type ReminderHours from "@/types/schedule/ReminderHours.types"
import type ScheduleRange from "@/types/schedule/ScheduleRange.types"
import type SlotMinutes from "@/types/schedule/SlotMinutes.types"

type ScheduleConfig = {
    slotMinutes: SlotMinutes
    seatsPerSlot: number
    windowDays: number
    minNoticeDays: MinNoticeDays
    waitAlertDays: number
    unitAddress: string
    unitAddressComplement: string | null
    reminderEnabled: boolean
    reminderHours: ReminderHours
    ranges: ScheduleRange[]
    blockedDates: BlockedDate[]
}

export default ScheduleConfig
