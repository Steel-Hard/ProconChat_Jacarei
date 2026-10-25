import type BlockedDate from "@/types/schedule/BlockedDate.types"
import type MinNoticeDays from "@/types/schedule/MinNoticeDays.types"
import type ReminderHours from "@/types/schedule/ReminderHours.types"
import type ScheduleDayDraft from "@/types/schedule/ScheduleDayDraft.types"
import type SlotMinutes from "@/types/schedule/SlotMinutes.types"

type ScheduleDraft = {
    days: ScheduleDayDraft[]
    slotMinutes: SlotMinutes
    seatsPerSlot: string
    windowDays: string
    minNoticeDays: MinNoticeDays
    waitAlertDays: string
    unitAddress: string
    unitAddressComplement: string
    reminderEnabled: boolean
    reminderHours: ReminderHours
    blockedDates: BlockedDate[]
}

export default ScheduleDraft
