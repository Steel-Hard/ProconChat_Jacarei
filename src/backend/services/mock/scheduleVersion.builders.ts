import { buildDefaultScheduleConfigView } from "../../repositories/mock/scheduleStub.repository"
import {
    BlockedDate,
    MinNoticeDays,
    ReminderHours,
    ScheduleRange,
    ScheduleSettings,
    ScheduleVersion,
    SlotMinutes,
} from "../../types/schedule.types"

export function scheduleVersionOf(
    settings: ScheduleSettings,
    ranges: ScheduleRange[],
    blockedDates: BlockedDate[],
    effectiveFrom: string | null = null,
): ScheduleVersion {
    return {
        effectiveFrom,
        config: buildDefaultScheduleConfigView({
            effectiveFrom,
            slotMinutes: settings.slot_minutes as SlotMinutes,
            seatsPerSlot: settings.seats_per_slot,
            windowDays: settings.window_days,
            minNoticeDays: settings.min_notice_days as MinNoticeDays,
            waitAlertDays: settings.wait_alert_days,
            unitAddress: settings.unit_address,
            unitAddressComplement: settings.unit_address_complement,
            reminderEnabled: settings.reminder_enabled,
            reminderHours: settings.reminder_hours as ReminderHours,
            ranges: ranges.map((range) => ({
                weekday: range.weekday,
                slotIndex: range.slot_index,
                startTime: range.start_time.slice(0, 5),
                endTime: range.end_time.slice(0, 5),
            })),
            blockedDates: blockedDates.map((block) => ({
                date: block.date,
                startTime: block.start_time?.slice(0, 5) ?? null,
                endTime: block.end_time?.slice(0, 5) ?? null,
                description: block.description,
            })),
        }),
    }
}
