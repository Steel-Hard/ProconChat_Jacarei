import BadRequestError from "../errors/BadRequestError"
import ScheduleNotConfiguredError from "../errors/ScheduleNotConfiguredError"
import { scheduleRepository } from "../repositories/schedule.repository"
import { IScheduleRepository } from "../repositories/schedule.repository.interface"
import { isValidMonthString } from "../schemas/schedule.schema"
import {
    AvailableSlot,
    BlockedDate,
    BookAppointmentInput,
    BookAppointmentResult,
    BookedDay,
    BookedDaysResult,
    MonthlyPreviewResult,
    NormalizedScheduleConfig,
    ScheduleConfigInput,
    ScheduleConfigView,
    ScheduleConflictItem,
    ScheduleRange,
    ScheduleSettings,
    SchedulePreviewConflict,
} from "../types/schedule.types"
import { addDaysToDateString, getLocalParts, parseLocalDate } from "../utils/date.utils"
import {
    calculateMonthlyPreview,
    computeWindowBounds,
    detectScheduleConflicts,
    freeSlotStartsOfDay,
    fromMinutes,
    getDowFromDateStr,
    getMonthDateBounds,
    normalizeAndValidateScheduleConfig,
    toMinutes,
} from "./scheduleRules"

export { freeSlotStartsOfDay, fromMinutes, getDowFromDateStr, toMinutes }

const WEEKDAYS_PT = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
]

export interface GetMonthlyPreviewParams {
    month?: string
    draftConfig?: ScheduleConfigInput
    now?: Date
}

export interface IScheduleService {
    getAvailableSlots(now?: Date): Promise<AvailableSlot[]>
    bookSlot(input: BookAppointmentInput): Promise<BookAppointmentResult>
    getConfig(): Promise<ScheduleConfigView>
    saveConfig(
        input: ScheduleConfigInput,
        actorUserId: number,
        now?: Date,
    ): Promise<ScheduleConfigView>
    getMonthlyPreview(params?: GetMonthlyPreviewParams): Promise<MonthlyPreviewResult>
    getBookedDays(now?: Date): Promise<BookedDaysResult>
}

function previewConflictOf(item: ScheduleConflictItem): SchedulePreviewConflict {
    return {
        protocol: item.protocol,
        date: item.date,
        time: item.time,
        status: item.status,
        code: item.code,
        reason: item.reason,
    }
}

export function createScheduleService(
    repository: IScheduleRepository,
): IScheduleService {
    async function getAvailableSlots(now = new Date()): Promise<AvailableSlot[]> {
        const settings = await repository.getSettings()
        if (!settings) {
            return []
        }

        const { dateStr: todayStr, timeStr: nowTimeStr } = getLocalParts(now)
        const nowMinutes = toMinutes(nowTimeStr)

        const ranges = await repository.getRanges()
        if (ranges.length === 0) {
            return []
        }

        const maxDateStr = addDaysToDateString(todayStr, settings.window_days + 15)
        const blockedDates = await repository.getBlockedDates(
            todayStr,
            maxDateStr,
        )

        const { startDateStr, endDateStr, hasValidStart } = computeWindowBounds(
            todayStr,
            settings,
            ranges,
            blockedDates,
        )
        if (!hasValidStart) {
            return []
        }

        interface CandidateSlot {
            datetime: Date
            dateStr: string
            timeStr: string
            formatted: string
        }

        const candidateSlots: CandidateSlot[] = []
        let curr = startDateStr

        while (curr <= endDateStr) {
            const dow = getDowFromDateStr(curr)
            const freeStarts = freeSlotStartsOfDay(
                curr,
                ranges,
                blockedDates,
                settings.slot_minutes,
            )

            for (const t of freeStarts) {
                if (curr === todayStr && t <= nowMinutes) {
                    continue
                }

                const slotTimeStr = fromMinutes(t)
                const [_y, m, d] = curr.split("-")
                const weekdayName = WEEKDAYS_PT[dow] ?? ""
                const formatted = `${weekdayName}, ${d}/${m} às ${slotTimeStr}`
                const datetime = parseLocalDate(curr, slotTimeStr)

                candidateSlots.push({
                    datetime,
                    dateStr: curr,
                    timeStr: slotTimeStr,
                    formatted,
                })
            }

            curr = addDaysToDateString(curr, 1)
        }

        if (candidateSlots.length === 0) {
            return []
        }

        const firstDatetime = candidateSlots[0]!.datetime
        const lastDatetime = candidateSlots[candidateSlots.length - 1]!.datetime

        const activeCounts = await repository.countActiveAppointmentsPerSlot(
            firstDatetime,
            lastDatetime,
        )

        const availableSlots: AvailableSlot[] = []

        for (const slot of candidateSlots) {
            const active = activeCounts.get(slot.datetime.toISOString()) ?? 0
            const remainingSeats = settings.seats_per_slot - active

            if (remainingSeats > 0) {
                availableSlots.push({
                    datetime: slot.datetime,
                    dateStr: slot.dateStr,
                    timeStr: slot.timeStr,
                    formatted: slot.formatted,
                    remainingSeats,
                })
            }
        }

        return availableSlots
    }

    async function bookSlot(
        input: BookAppointmentInput,
    ): Promise<BookAppointmentResult> {
        return repository.bookAppointment(input)
    }

    async function getConfig(): Promise<ScheduleConfigView> {
        const config = await repository.getConfig()
        if (!config) {
            throw new ScheduleNotConfiguredError()
        }
        return config
    }

    async function saveConfig(
        input: ScheduleConfigInput,
        actorUserId: number,
        now = new Date(),
    ): Promise<ScheduleConfigView> {
        const normalized = normalizeAndValidateScheduleConfig(input)
        return repository.saveConfig({
            config: normalized,
            actorUserId,
            now,
        })
    }

    async function getMonthlyPreview(
        params: GetMonthlyPreviewParams = {},
    ): Promise<MonthlyPreviewResult> {
        const now = params.now ?? new Date()
        const { dateStr: todayStr } = getLocalParts(now)
        const targetMonth = params.month ?? todayStr.slice(0, 7)

        if (!isValidMonthString(targetMonth)) {
            throw new BadRequestError("Mês inválido")
        }

        let baseConfig: NormalizedScheduleConfig
        let savedConfig: ScheduleConfigView | null
        if (params.draftConfig) {
            baseConfig = normalizeAndValidateScheduleConfig(params.draftConfig)
            savedConfig = await repository.getConfig()
        } else {
            savedConfig = await getConfig()
            baseConfig = savedConfig
        }

        const settings: Pick<
            ScheduleSettings,
            "slot_minutes" | "seats_per_slot" | "window_days" | "min_notice_days"
        > = {
            slot_minutes: baseConfig.slotMinutes,
            seats_per_slot: baseConfig.seatsPerSlot,
            window_days: baseConfig.windowDays,
            min_notice_days: baseConfig.minNoticeDays,
        }

        const ranges: Pick<
            ScheduleRange,
            "weekday" | "slot_index" | "start_time" | "end_time"
        >[] = baseConfig.ranges.map((r) => ({
            weekday: r.weekday,
            slot_index: r.slotIndex,
            start_time: r.startTime,
            end_time: r.endTime,
        }))

        const blockedDates: Pick<
            BlockedDate,
            "date" | "start_time" | "end_time" | "description"
        >[] = baseConfig.blockedDates.map((b) => ({
            date: b.date,
            start_time: b.startTime,
            end_time: b.endTime,
            description: b.description,
        }))

        const { firstDateStr, lastDateStr } = getMonthDateBounds(targetMonth)
        const windowEndBound = addDaysToDateString(todayStr, settings.window_days + 15)
        const minDateStr = firstDateStr < todayStr ? firstDateStr : todayStr
        const maxDateStr = lastDateStr > windowEndBound ? lastDateStr : windowEndBound

        const fromDatetime = parseLocalDate(minDateStr, "00:00")
        const toDatetime = parseLocalDate(maxDateStr, "23:59")

        const activeCounts = await repository.countActiveAppointmentsPerSlot(
            fromDatetime,
            toDatetime,
        )

        const preview = calculateMonthlyPreview({
            month: targetMonth,
            now,
            settings,
            ranges,
            blockedDates,
            activeCounts,
        })

        const futureAppointments = await repository.listFutureActiveAppointments(now)
        const conflicts = detectScheduleConflicts(
            baseConfig,
            futureAppointments,
            savedConfig?.slotMinutes ?? null,
        ).map(previewConflictOf)

        return { ...preview, conflicts }
    }

    async function getBookedDays(now = new Date()): Promise<BookedDaysResult> {
        const appointments = await repository.listFutureActiveAppointments(now)
        const byDate = new Map<string, Map<string, number>>()

        for (const appointment of appointments.filter((a) => !a.offGrid)) {
            const { dateStr, timeStr } = getLocalParts(appointment.appointmentDatetime)
            const times = byDate.get(dateStr) ?? new Map<string, number>()
            times.set(timeStr, (times.get(timeStr) ?? 0) + 1)
            byDate.set(dateStr, times)
        }

        const days: BookedDay[] = [...byDate.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, times]) => {
                const sortedTimes = [...times.entries()]
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([time, count]) => ({ time, count }))
                return {
                    date,
                    weekday: getDowFromDateStr(date),
                    total: sortedTimes.reduce((sum, item) => sum + item.count, 0),
                    times: sortedTimes,
                }
            })

        return { days }
    }

    return {
        getAvailableSlots,
        bookSlot,
        getConfig,
        saveConfig,
        getMonthlyPreview,
        getBookedDays,
    }
}

export const scheduleService = createScheduleService(scheduleRepository)
