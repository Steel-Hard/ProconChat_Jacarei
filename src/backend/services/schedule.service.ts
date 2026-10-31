import BadRequestError from "../errors/BadRequestError"
import ScheduleNotConfiguredError from "../errors/ScheduleNotConfiguredError"
import { scheduleRepository } from "../repositories/schedule.repository"
import { IScheduleRepository } from "../repositories/schedule.repository.interface"
import { isValidCalendarDate, isValidMonthString } from "../schemas/schedule.schema"
import {
    AvailableSlot,
    BookAppointmentInput,
    BookAppointmentResult,
    BookedDay,
    BookedDaysResult,
    MonthlyPreviewResult,
    NormalizedScheduleConfig,
    ScheduleConfigInput,
    ScheduleConfigView,
    ScheduleConflictItem,
    SchedulePreviewConflict,
    ScheduleVersion,
} from "../types/schedule.types"
import { addDaysToDateString, getLocalParts, parseLocalDate } from "../utils/date.utils"
import {
    appointmentsInScheduleInterval,
    blockVigencyIssues,
    calculateMonthlyPreview,
    computeVersionedWindowBounds,
    DayGrid,
    detectScheduleConflicts,
    effectiveVersionOf,
    freeSlotStartsOfDay,
    fromMinutes,
    getDowFromDateStr,
    getMonthDateBounds,
    normalizeAndValidateScheduleConfig,
    scheduleBlockedDatesOf,
    scheduleRangesOf,
    scheduleSettingsOf,
    toMinutes,
    WindowBounds,
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
    draftEffectiveFrom?: string
    now?: Date
}

export interface IScheduleService {
    getAvailableSlots(now?: Date): Promise<AvailableSlot[]>
    bookSlot(input: BookAppointmentInput): Promise<BookAppointmentResult>
    getConfig(): Promise<ScheduleConfigView>
    getConfigForDate(date: string): Promise<ScheduleConfigView>
    listScheduledConfigs(fromDate?: string, now?: Date): Promise<ScheduleVersion[]>
    saveConfig(
        input: ScheduleConfigInput,
        actorUserId: number,
        now?: Date,
    ): Promise<ScheduleConfigView>
    saveScheduledConfig(
        input: ScheduleConfigInput,
        effectiveFrom: string,
        actorUserId: number,
        now?: Date,
    ): Promise<ScheduleConfigView>
    deleteScheduledConfig(effectiveFrom: string, now?: Date): Promise<void>
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

function dayGridOf(config: ScheduleConfigView): DayGrid {
    return {
        ranges: scheduleRangesOf(config),
        blockedDates: scheduleBlockedDatesOf(config),
        slotMinutes: config.slotMinutes,
    }
}

function windowBoundsOf(versions: ScheduleVersion[], current: ScheduleVersion, todayStr: string): WindowBounds {
    const grids = new Map(versions.map((version) => [version, dayGridOf(version.config)]))
    return computeVersionedWindowBounds(
        todayStr,
        scheduleSettingsOf(current.config),
        (dateStr) => {
            const version = effectiveVersionOf(versions, dateStr)
            return version ? grids.get(version) ?? null : null
        },
        versions.some((version) => version.config.ranges.length > 0),
    )
}

export function createScheduleService(
    repository: IScheduleRepository,
): IScheduleService {
    function blocksInVigencyCheck(
        input: ScheduleConfigInput,
        start: string,
        todayStr: string,
    ): (versions: ScheduleVersion[]) => void {
        return (versions) => {
            const reference = effectiveVersionOf(versions, start)
            const next = versions.find((version) =>
                version.effectiveFrom !== null && version.effectiveFrom > start,
            )?.effectiveFrom ?? null
            const issues = blockVigencyIssues(input.blockedDates, reference?.config.blockedDates ?? [], {
                today: todayStr,
                start,
                next,
            })
            if (issues.length > 0) {
                throw new BadRequestError(
                    `Dados inválidos: ${issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`,
                    { issues },
                )
            }
        }
    }

    async function getAvailableSlots(now = new Date()): Promise<AvailableSlot[]> {
        const { dateStr: todayStr, timeStr: nowTimeStr } = getLocalParts(now)
        const versions = await repository.getScheduleVersions(
            todayStr,
            addDaysToDateString(todayStr, 195),
        )
        if (versions.length === 0) {
            return []
        }

        const currentVersion = effectiveVersionOf(versions, todayStr)
        if (!currentVersion) {
            return []
        }
        const { startDateStr, endDateStr, hasValidStart } = windowBoundsOf(versions, currentVersion, todayStr)
        if (!hasValidStart) {
            return []
        }

        const nowMinutes = toMinutes(nowTimeStr)

        interface CandidateSlot {
            datetime: Date
            dateStr: string
            timeStr: string
            formatted: string
            seatsPerSlot: number
        }

        const candidateSlots: CandidateSlot[] = []
        let curr = startDateStr

        while (curr <= endDateStr) {
            const config = (effectiveVersionOf(versions, curr) ?? currentVersion).config
            const settings = scheduleSettingsOf(config)
            const ranges = scheduleRangesOf(config)
            const blockedDates = scheduleBlockedDatesOf(config)

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
                    seatsPerSlot: settings.seats_per_slot,
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
            const remainingSeats = slot.seatsPerSlot - active

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

    async function getConfigForDate(date: string): Promise<ScheduleConfigView> {
        if (!isValidCalendarDate(date)) {
            throw new BadRequestError("Data inválida")
        }
        const version = await repository.getConfigForDate(date)
        if (!version) {
            throw new ScheduleNotConfiguredError()
        }
        return version.config
    }

    async function listScheduledConfigs(fromDate?: string, now = new Date()): Promise<ScheduleVersion[]> {
        const startDate = fromDate ?? getLocalParts(now).dateStr
        if (!isValidCalendarDate(startDate)) {
            throw new BadRequestError("Data inválida")
        }
        return repository.listScheduledConfigs(startDate)
    }

    async function saveConfig(
        input: ScheduleConfigInput,
        actorUserId: number,
        now = new Date(),
    ): Promise<ScheduleConfigView> {
        const normalized = normalizeAndValidateScheduleConfig(input)
        const todayStr = getLocalParts(now).dateStr
        return repository.saveConfig({
            config: normalized,
            actorUserId,
            now,
            validateAgainstVersions: blocksInVigencyCheck(input, todayStr, todayStr),
        })
    }

    async function saveScheduledConfig(
        input: ScheduleConfigInput,
        effectiveFrom: string,
        actorUserId: number,
        now = new Date(),
    ): Promise<ScheduleConfigView> {
        if (!isValidCalendarDate(effectiveFrom)) {
            throw new BadRequestError("Data de início inválida")
        }
        if (effectiveFrom <= getLocalParts(now).dateStr) {
            throw new BadRequestError("A data de início da mudança deve ser futura")
        }
        const normalized = normalizeAndValidateScheduleConfig(input)
        return repository.saveScheduledConfig({
            config: normalized,
            effectiveFrom,
            actorUserId,
            now,
            validateAgainstVersions: blocksInVigencyCheck(input, effectiveFrom, getLocalParts(now).dateStr),
        })
    }

    async function deleteScheduledConfig(effectiveFrom: string, now = new Date()): Promise<void> {
        if (!isValidCalendarDate(effectiveFrom)) {
            throw new BadRequestError("Data de início inválida")
        }
        return repository.deleteScheduledConfig(effectiveFrom, now)
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

        const { firstDateStr, lastDateStr } = getMonthDateBounds(targetMonth)
        const minDateStr = firstDateStr < todayStr ? firstDateStr : todayStr
        const versionsEnd = lastDateStr > addDaysToDateString(todayStr, 195)
            ? lastDateStr
            : addDaysToDateString(todayStr, 195)
        let versions = await repository.getScheduleVersions(minDateStr, versionsEnd)
        let draftConfig: NormalizedScheduleConfig | null = null
        let draftEffectiveFrom: string | null = null
        let previousVersion: ScheduleVersion | null = null

        if (params.draftConfig) {
            draftConfig = normalizeAndValidateScheduleConfig(params.draftConfig)
            draftEffectiveFrom = params.draftEffectiveFrom ?? todayStr
            if (!isValidCalendarDate(draftEffectiveFrom)) {
                throw new BadRequestError("Data de início inválida")
            }
            const existing = versions.find((version) => version.effectiveFrom === draftEffectiveFrom)
            const priorDate = addDaysToDateString(draftEffectiveFrom, -1)
            previousVersion = effectiveVersionOf(versions, priorDate)
            const draftView: ScheduleConfigView = {
                ...draftConfig,
                effectiveFrom: draftEffectiveFrom,
                updatedBy: existing?.config.updatedBy ?? null,
                updatedAt: existing?.config.updatedAt ?? null,
            }
            versions = versions
                .filter((version) => version.effectiveFrom !== draftEffectiveFrom)
                .concat({ effectiveFrom: draftEffectiveFrom, config: draftView })
                .sort((a, b) => (a.effectiveFrom ?? "").localeCompare(b.effectiveFrom ?? ""))
        }

        if (versions.length === 0) {
            throw new ScheduleNotConfiguredError()
        }

        const currentVersion = effectiveVersionOf(versions, todayStr)
        if (!currentVersion) {
            throw new ScheduleNotConfiguredError()
        }
        const windowBounds = windowBoundsOf(versions, currentVersion, todayStr)
        const windowEnd = windowBounds.endDateStr
        const maxDateStr = lastDateStr > windowEnd ? lastDateStr : windowEnd

        const fromDatetime = parseLocalDate(minDateStr, "00:00")
        const toDatetime = parseLocalDate(maxDateStr, "23:59")

        const activeCounts = await repository.countActiveAppointmentsPerSlot(
            fromDatetime,
            toDatetime,
        )

        const months: string[] = []
        let monthCursor = minDateStr.slice(0, 7)
        const lastMonth = maxDateStr.slice(0, 7)
        while (monthCursor <= lastMonth) {
            months.push(monthCursor)
            const [year, month] = monthCursor.split("-").map(Number)
            const nextMonth = month === 12 ? 1 : month! + 1
            const nextYear = month === 12 ? year! + 1 : year!
            monthCursor = `${nextYear}-${String(nextMonth).padStart(2, "0")}`
        }

        const previewCache = new Map<string, Map<string, MonthlyPreviewResult>>()
        for (const version of versions) {
            const key = version.effectiveFrom ?? "baseline"
            const perMonth = new Map<string, MonthlyPreviewResult>()
            const settings = scheduleSettingsOf(version.config)
            const ranges = scheduleRangesOf(version.config)
            const blockedDates = scheduleBlockedDatesOf(version.config)
            for (const month of months) {
                perMonth.set(month, {
                    ...calculateMonthlyPreview({
                        month,
                        now,
                        settings,
                        ranges,
                        blockedDates,
                        activeCounts,
                        windowBounds,
                    }),
                    conflicts: [],
                })
            }
            previewCache.set(key, perMonth)
        }

        function dayPreview(date: string) {
            const version = effectiveVersionOf(versions, date)
            if (!version) {
                return null
            }
            return previewCache.get(version.effectiveFrom ?? "baseline")?.get(date.slice(0, 7))
                ?.days.find((day) => day.date === date) ?? null
        }

        const weekdaysVersion = draftEffectiveFrom ?? currentVersion.effectiveFrom ?? "baseline"
        const weekdaysPreview = previewCache.get(weekdaysVersion)?.get(todayStr.slice(0, 7))
        if (!weekdaysPreview) {
            throw new ScheduleNotConfiguredError()
        }
        const requestedDays = Array.from({ length: Number(lastDateStr.slice(-2)) }, (_, index) => {
            const date = `${targetMonth}-${String(index + 1).padStart(2, "0")}`
            return dayPreview(date)!
        })
        let totalWindowSlots = 0
        let totalWindowSeats = 0
        let usedWindowSeats = 0
        for (let date = windowBounds.startDateStr; date <= windowEnd; date = addDaysToDateString(date, 1)) {
            const day = dayPreview(date)
            if (!day) {
                continue
            }
            totalWindowSlots += day.slots.filter((slot) => slot.offered).length
            totalWindowSeats += day.capacity
            usedWindowSeats += day.usedSeats
        }

        const futureAppointments = await repository.listFutureActiveAppointments(now)
        let conflicts: SchedulePreviewConflict[]
        if (draftConfig && draftEffectiveFrom) {
            const draftStart = draftEffectiveFrom
            const nextVersion = versions.find((version) =>
                version.effectiveFrom !== null && version.effectiveFrom > draftStart,
            )
            conflicts = detectScheduleConflicts(
                draftConfig,
                appointmentsInScheduleInterval(futureAppointments, draftStart, nextVersion?.effectiveFrom ?? null),
                previousVersion?.config.slotMinutes ?? null,
            ).map(previewConflictOf)
        } else {
            conflicts = versions.flatMap((version, index) => {
                const start = version.effectiveFrom !== null && version.effectiveFrom > todayStr
                    ? version.effectiveFrom
                    : todayStr
                const next = versions[index + 1]?.effectiveFrom ?? null
                return detectScheduleConflicts(
                    version.config,
                    appointmentsInScheduleInterval(futureAppointments, start, next),
                    version.config.slotMinutes,
                ).map(previewConflictOf)
            })
        }

        return {
            month: targetMonth,
            today: todayStr,
            windowStart: windowBounds.startDateStr,
            windowEnd,
            totalWindowSlots,
            totalWindowSeats,
            usedWindowSeats,
            freeWindowSeats: totalWindowSeats - usedWindowSeats,
            weekdays: weekdaysPreview.weekdays,
            days: requestedDays,
            conflicts,
        }
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
        getConfigForDate,
        listScheduledConfigs,
        saveConfig,
        saveScheduledConfig,
        deleteScheduledConfig,
        getMonthlyPreview,
        getBookedDays,
    }
}

export const scheduleService = createScheduleService(scheduleRepository)
