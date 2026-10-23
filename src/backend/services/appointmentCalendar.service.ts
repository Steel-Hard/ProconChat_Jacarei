import { AppointmentRepository } from "../repositories/appointment.repository.interface"
import { IScheduleRepository } from "../repositories/schedule.repository.interface"
import type { AppointmentCalendar, CalendarDay, CalendarFilters } from "../types/appointment.types"
import type { BlockedDate, ScheduleRange, ScheduleSettings } from "../types/schedule.types"
import { addDaysToDateString, getLocalParts, parseLocalDate, toLocalDateString } from "../utils/date.utils"
import { WEEK_START_DAY, weekRange } from "../utils/week.utils"
import { freeSlotStartsOfDay, fromMinutes, IScheduleService } from "./schedule.service"

export type AppointmentCalendarAppointments = Pick<AppointmentRepository, "findWeek">

export interface AppointmentCalendarDependencies {
    schedule: Pick<IScheduleService, "getAvailableSlots">
    scheduleRepository: Pick<IScheduleRepository, "getSettings" | "getRanges" | "getBlockedDates">
    appointments: AppointmentCalendarAppointments
    clock?: () => Date
    weekStartDay?: number
}

export interface CalendarRequest extends CalendarFilters {
    date?: string
}

export interface AppointmentCalendarService {
    getCalendar(request: CalendarRequest): Promise<AppointmentCalendar>
}

function hourMinute(time: string): string {
    return time.slice(0, 5)
}

function buildDay(
    date: string,
    settings: ScheduleSettings,
    ranges: ScheduleRange[],
    blockedDates: BlockedDate[],
    offered: Map<string, number>,
): CalendarDay | null {
    const grid = freeSlotStartsOfDay(date, ranges, [], settings.slot_minutes)
    if (grid.length === 0) {
        return null
    }
    const blockedOfDay = blockedDates.filter((blocked) => blocked.date === date)
    return {
        date,
        blocked: {
            fullDay: blockedOfDay.some((blocked) => !blocked.start_time || !blocked.end_time),
            periods: blockedOfDay
                .filter((blocked) => blocked.start_time && blocked.end_time)
                .map((blocked) => ({
                    start: hourMinute(blocked.start_time!),
                    end: hourMinute(blocked.end_time!),
                    description: blocked.description,
                })),
        },
        slots: grid.map((start) => {
            const time = fromMinutes(start)
            return { time, freeSeats: offered.get(`${date} ${time}`) ?? null }
        }),
    }
}

export function createAppointmentCalendarService({
    schedule,
    scheduleRepository,
    appointments,
    clock = () => new Date(),
    weekStartDay = WEEK_START_DAY,
}: AppointmentCalendarDependencies): AppointmentCalendarService {
    return {
        async getCalendar({ date, status, responsible, currentUserId }) {
            const now = clock()
            const range = weekRange(date ?? toLocalDateString(now), weekStartDay)
            const from = parseLocalDate(range.weekStart, "00:00")
            const to = parseLocalDate(addDaysToDateString(range.weekEnd, 1), "00:00")
            const records = await appointments.findWeek(from, to, { status, responsible, currentUserId }, now)

            const settings = await scheduleRepository.getSettings()
            let days: CalendarDay[] = []
            if (settings) {
                const ranges = await scheduleRepository.getRanges()
                const blockedDates = await scheduleRepository.getBlockedDates(range.weekStart, range.weekEnd)
                const offered = new Map(
                    (await schedule.getAvailableSlots(now)).map((slot) => [`${slot.dateStr} ${slot.timeStr}`, slot.remainingSeats]),
                )
                days = range.dates
                    .map((day) => buildDay(day, settings, ranges, blockedDates, offered))
                    .filter((day): day is CalendarDay => day !== null)
            }

            return {
                weekStart: range.weekStart,
                weekEnd: range.weekEnd,
                weekStartDay,
                days,
                appointments: records.map((record) => {
                    const local = getLocalParts(record.appointmentDatetime)
                    return {
                        id: record.id,
                        protocol: record.protocol,
                        shortName: record.shortName,
                        date: local.dateStr,
                        time: local.timeStr,
                        status: record.status,
                        assigned_user_id: record.assigned_user_id,
                        off_grid: record.off_grid,
                    }
                }),
            }
        },
    }
}
