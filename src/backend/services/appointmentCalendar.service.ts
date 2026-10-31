import { AppointmentRepository } from "../repositories/appointment.repository.interface"
import { IScheduleRepository } from "../repositories/schedule.repository.interface"
import type { AppointmentCalendar, CalendarDay, CalendarFilters } from "../types/appointment.types"
import type { BlockedDate, ScheduleRange, ScheduleSettings, ScheduleVersion } from "../types/schedule.types"
import { addDaysToDateString, getLocalParts, parseLocalDate, toLocalDateString } from "../utils/date.utils"
import { WEEK_START_DAY, weekRange } from "../utils/week.utils"
import { freeSlotStartsOfDay, fromMinutes, IScheduleService } from "./schedule.service"

export type AppointmentCalendarAppointments = Pick<AppointmentRepository, "findWeek">

export interface AppointmentCalendarDependencies {
    schedule: Pick<IScheduleService, "getAvailableSlots">
    scheduleRepository: Pick<IScheduleRepository, "getScheduleVersions">
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
    version: ScheduleVersion,
    offered: Map<string, number>,
): CalendarDay | null {
    const config = version.config
    const settings: ScheduleSettings = {
        id: 1,
        slot_minutes: config.slotMinutes,
        seats_per_slot: config.seatsPerSlot,
        window_days: config.windowDays,
        min_notice_days: config.minNoticeDays,
        wait_alert_days: config.waitAlertDays,
        unit_address: config.unitAddress,
        unit_address_complement: config.unitAddressComplement,
        reminder_enabled: config.reminderEnabled,
        reminder_hours: config.reminderHours,
    }
    const ranges: ScheduleRange[] = config.ranges.map((range, index) => ({
        id: index + 1,
        weekday: range.weekday,
        slot_index: range.slotIndex,
        start_time: range.startTime,
        end_time: range.endTime,
    }))
    const blockedDates: BlockedDate[] = config.blockedDates
        .filter((block) => block.date === date)
        .map((block, index) => ({
            id: index + 1,
            date: block.date,
            start_time: block.startTime,
            end_time: block.endTime,
            description: block.description,
        }))
    const grid = freeSlotStartsOfDay(date, ranges, [], settings.slot_minutes)
    if (grid.length === 0) {
        return null
    }
    const blockedOfDay = blockedDates.filter((blocked) => blocked.date === date)
    const fullDay = blockedOfDay.find((blocked) => !blocked.start_time || !blocked.end_time)
    return {
        date,
        blocked: {
            fullDay: fullDay !== undefined,
            description: fullDay?.description ?? null,
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

            let days: CalendarDay[] = []
            const versions = await scheduleRepository.getScheduleVersions(range.weekStart, range.weekEnd)
            if (versions.length > 0) {
                const offered = new Map(
                    (await schedule.getAvailableSlots(now)).map((slot) => [`${slot.dateStr} ${slot.timeStr}`, slot.remainingSeats]),
                )
                days = range.dates
                    .map((day) => {
                        const version = versions.filter((item) => item.effectiveFrom === null || item.effectiveFrom <= day).at(-1)
                        return version ? buildDay(day, version, offered) : null
                    })
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
