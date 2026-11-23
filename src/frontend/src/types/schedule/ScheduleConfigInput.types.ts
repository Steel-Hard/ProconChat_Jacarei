import type BlockedDate from "@/types/schedule/BlockedDate.types"
import type MinNoticeDays from "@/types/schedule/MinNoticeDays.types"
import type ReminderHours from "@/types/schedule/ReminderHours.types"
import type SlotMinutes from "@/types/schedule/SlotMinutes.types"

type ScheduleConfigInput = {
    slotMinutes: SlotMinutes
    seatsPerSlot: number
    windowDays: number
    minNoticeDays: MinNoticeDays
    waitAlertDays: number
    unitAddress: string
    unitAddressComplement: string | null
    reminderEnabled: boolean
    reminderHours: ReminderHours
    ranges: { weekday: number; startTime: string; endTime: string }[]
    blockedDates: BlockedDate[]
}

export default ScheduleConfigInput
