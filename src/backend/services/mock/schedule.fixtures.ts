import { BlockedDate, ScheduleRange, ScheduleSettings } from "../../types/schedule.types"

export function buildScheduleSettings(overrides: Partial<ScheduleSettings> = {}): ScheduleSettings {
    return {
        id: 1,
        slot_minutes: 30,
        seats_per_slot: 2,
        window_days: 7,
        min_notice_days: 1,
        wait_alert_days: 7,
        unit_address: "Rua do Procon, 100",
        unit_address_complement: "Sala 2",
        reminder_enabled: true,
        reminder_hours: 24,
        ...overrides,
    }
}

export function weekdayRanges(
    startTime: string,
    endTime: string,
    weekdays: number[] = [1, 2, 3, 4, 5],
): ScheduleRange[] {
    return weekdays.map((weekday) => ({
        id: weekday,
        weekday,
        slot_index: 1,
        start_time: startTime,
        end_time: endTime,
    }))
}

export function fullDayBlock(date: string, overrides: Partial<BlockedDate> = {}): BlockedDate {
    return {
        id: 1,
        date,
        start_time: null,
        end_time: null,
        description: "Feriado Municipal",
        ...overrides,
    }
}

export function partialBlock(
    date: string,
    startTime: string,
    endTime: string,
    overrides: Partial<BlockedDate> = {},
): BlockedDate {
    return {
        id: 2,
        date,
        start_time: startTime,
        end_time: endTime,
        description: "Manutenção",
        ...overrides,
    }
}
