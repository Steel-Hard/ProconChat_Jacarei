import { buildDefaultScheduleConfigView } from "../../repositories/mock/scheduleStub.repository"
import { ScheduleConfigInput } from "../../types/schedule.types"

export function buildScheduleConfigInput(overrides: Partial<ScheduleConfigInput> = {}): ScheduleConfigInput {
    const def = buildDefaultScheduleConfigView()
    return {
        slotMinutes: def.slotMinutes,
        seatsPerSlot: def.seatsPerSlot,
        windowDays: def.windowDays,
        minNoticeDays: def.minNoticeDays,
        waitAlertDays: def.waitAlertDays,
        unitAddress: def.unitAddress,
        unitAddressComplement: def.unitAddressComplement,
        reminderEnabled: def.reminderEnabled,
        reminderHours: def.reminderHours,
        ranges: def.ranges,
        blockedDates: def.blockedDates,
        ...overrides,
    }
}
