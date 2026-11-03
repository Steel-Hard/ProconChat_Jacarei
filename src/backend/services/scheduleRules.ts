import { scheduleConfigBodySchema } from "../schemas/schedule.schema"
import { overlaps } from "./responsibleAvailability"
import type {
    BlockedDate,
    BlockedDateItem,
    DayPreview,
    DayPreviewStatus,
    DaySlotPreview,
    FutureActiveAppointment,
    MonthlyGridPreview,
    NormalizedScheduleConfig,
    ScheduleConfigInput,
    ScheduleConfigView,
    ScheduleConflictCode,
    ScheduleConflictItem,
    ScheduleRange,
    ScheduleRangeItem,
    ScheduleSettings,
    ScheduleVersion,
    WeekdayPreview,
} from "../types/schedule.types"
import { addDaysToDateString, getLocalParts, parseLocalDate } from "../utils/date.utils"
import { validateSchema } from "../utils/validateSchema"

export function effectiveVersionOf(versions: ScheduleVersion[], date: string): ScheduleVersion | null {
    let effective: ScheduleVersion | null = null
    for (const version of versions) {
        if (version.effectiveFrom === null || version.effectiveFrom <= date) {
            effective = version
        }
    }
    return effective
}

export function scheduleSettingsOf(config: ScheduleConfigView): ScheduleSettings {
    return {
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
}

export function scheduleRangesOf(config: Pick<ScheduleConfigView, "ranges">): ScheduleRange[] {
    return config.ranges.map((range, index) => ({
        id: index + 1,
        weekday: range.weekday,
        slot_index: range.slotIndex,
        start_time: range.startTime,
        end_time: range.endTime,
    }))
}

export function scheduleBlockedDatesOf(config: Pick<ScheduleConfigView, "blockedDates">): BlockedDate[] {
    return config.blockedDates.map((block, index) => ({
        id: index + 1,
        date: block.date,
        start_time: block.startTime,
        end_time: block.endTime,
        description: block.description,
    }))
}

export function toMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(":").map(Number)
    return (h ?? 0) * 60 + (m ?? 0)
}

export function fromMinutes(mins: number): string {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export function trimTime(timeStr: string): string {
    return timeStr.trim().slice(0, 5)
}

export function getDowFromDateStr(dateStr: string): number {
    const [y, m, d] = dateStr.split("-").map(Number)
    const dt = new Date(Date.UTC(y!, m! - 1, d!, 12, 0, 0))
    return dt.getUTCDay()
}

export function slotsForWeekday(
    weekday: number,
    ranges: Pick<ScheduleRange, "weekday" | "slot_index" | "start_time" | "end_time">[],
    slotMinutes: number,
): number[] {
    const rangesForDay = ranges
        .filter((r) => r.weekday === weekday)
        .sort((a, b) => a.slot_index - b.slot_index)

    const starts: number[] = []
    for (const range of rangesForDay) {
        const startMin = toMinutes(range.start_time)
        const endMin = toMinutes(range.end_time)
        for (let t = startMin; t + slotMinutes <= endMin; t += slotMinutes) {
            starts.push(t)
        }
    }
    return starts
}

export function freeSlotStartsOfDay(
    dateStr: string,
    ranges: Pick<ScheduleRange, "weekday" | "slot_index" | "start_time" | "end_time">[],
    blockedDates: Pick<BlockedDate, "date" | "start_time" | "end_time">[],
    slotMinutes: number,
): number[] {
    const dow = getDowFromDateStr(dateStr)
    const weekdayStarts = slotsForWeekday(dow, ranges, slotMinutes)
    if (weekdayStarts.length === 0) {
        return []
    }

    const fullDayBlocked = blockedDates.some(
        (b) => b.date === dateStr && (!b.start_time || !b.end_time),
    )
    if (fullDayBlocked) {
        return []
    }

    const partialBlocks = blockedDates.filter(
        (b) => b.date === dateStr && b.start_time && b.end_time,
    )

    if (partialBlocks.length === 0) {
        return weekdayStarts
    }

    return weekdayStarts.filter((slotStart) => {
        const slotEnd = slotStart + slotMinutes
        return !partialBlocks.some((p) => {
            const pStart = toMinutes(p.start_time!)
            const pEnd = toMinutes(p.end_time!)
            return slotStart < pEnd && slotEnd > pStart
        })
    })
}

export function isBusinessDay(
    dateStr: string,
    ranges: Pick<ScheduleRange, "weekday" | "slot_index" | "start_time" | "end_time">[],
    blockedDates: Pick<BlockedDate, "date" | "start_time" | "end_time">[],
    slotMinutes: number,
): boolean {
    return freeSlotStartsOfDay(dateStr, ranges, blockedDates, slotMinutes).length > 0
}

export interface WindowBounds {
    startDateStr: string
    endDateStr: string
    hasValidStart: boolean
}

export interface DayGrid {
    ranges: Pick<ScheduleRange, "weekday" | "slot_index" | "start_time" | "end_time">[]
    blockedDates: Pick<BlockedDate, "date" | "start_time" | "end_time">[]
    slotMinutes: number
}

export function computeVersionedWindowBounds(
    todayStr: string,
    settings: Pick<ScheduleSettings, "window_days" | "min_notice_days">,
    gridOf: (dateStr: string) => DayGrid | null,
    hasRanges: boolean,
): WindowBounds {
    const endDateStr = addDaysToDateString(todayStr, settings.window_days)
    if (!hasRanges) {
        return { startDateStr: todayStr, endDateStr, hasValidStart: false }
    }

    let startDateStr = todayStr
    if (settings.min_notice_days > 0) {
        let n = 0
        let d = todayStr
        let iterations = 0
        const maxIterations = settings.window_days + 30
        while (n < settings.min_notice_days && iterations < maxIterations) {
            iterations++
            d = addDaysToDateString(d, 1)
            const grid = gridOf(d)
            if (grid && isBusinessDay(d, grid.ranges, grid.blockedDates, grid.slotMinutes)) {
                n++
            }
        }
        if (n < settings.min_notice_days) {
            return { startDateStr: endDateStr, endDateStr, hasValidStart: false }
        }
        startDateStr = d
    }

    return {
        startDateStr,
        endDateStr,
        hasValidStart: startDateStr <= endDateStr,
    }
}

export function computeWindowBounds(
    todayStr: string,
    settings: Pick<ScheduleSettings, "window_days" | "min_notice_days" | "slot_minutes">,
    ranges: Pick<ScheduleRange, "weekday" | "slot_index" | "start_time" | "end_time">[],
    blockedDates: Pick<BlockedDate, "date" | "start_time" | "end_time">[],
): WindowBounds {
    return computeVersionedWindowBounds(
        todayStr,
        settings,
        () => ({ ranges, blockedDates, slotMinutes: settings.slot_minutes }),
        ranges.length > 0,
    )
}

export function normalizeAndValidateScheduleConfig(
    input: ScheduleConfigInput,
): NormalizedScheduleConfig {
    const parsed = validateSchema(scheduleConfigBodySchema, input)

    const normalizedRanges: ScheduleRangeItem[] = []
    for (let dow = 0; dow <= 6; dow++) {
        parsed.ranges
            .filter((range) => range.weekday === dow)
            .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))
            .forEach((range, index) => {
                normalizedRanges.push({
                    weekday: range.weekday,
                    slotIndex: index + 1,
                    startTime: range.startTime,
                    endTime: range.endTime,
                })
            })
    }

    const normalizedBlocks: BlockedDateItem[] = parsed.blockedDates
        .map((block) => ({
            date: block.date,
            startTime: block.startTime ?? null,
            endTime: block.endTime ?? null,
            description: block.description,
        }))
        .sort((a, b) =>
            `${a.date} ${a.startTime ?? ""}`.localeCompare(`${b.date} ${b.startTime ?? ""}`),
        )

    return {
        slotMinutes: parsed.slotMinutes,
        seatsPerSlot: parsed.seatsPerSlot,
        windowDays: parsed.windowDays,
        minNoticeDays: parsed.minNoticeDays,
        waitAlertDays: parsed.waitAlertDays,
        unitAddress: parsed.unitAddress,
        unitAddressComplement: parsed.unitAddressComplement ?? null,
        reminderEnabled: parsed.reminderEnabled,
        reminderHours: parsed.reminderHours,
        ranges: normalizedRanges,
        blockedDates: normalizedBlocks,
    }
}

function byRequestOrder(a: FutureActiveAppointment, b: FutureActiveAppointment): number {
    return (
        a.requestDatetime.getTime() - b.requestDatetime.getTime() ||
        Number(a.id) - Number(b.id)
    )
}

function byAppointmentOrder(a: FutureActiveAppointment, b: FutureActiveAppointment): number {
    return (
        a.appointmentDatetime.getTime() - b.appointmentDatetime.getTime() ||
        Number(a.id) - Number(b.id)
    )
}

function conflictItemOf(
    appt: FutureActiveAppointment,
    code: ScheduleConflictCode,
    reason: string,
): ScheduleConflictItem {
    const { dateStr, timeStr } = getLocalParts(appt.appointmentDatetime)
    return {
        id: appt.id,
        protocol: appt.protocol,
        name: appt.name,
        cpfMasked: appt.cpfMasked,
        appointmentDatetime: appt.appointmentDatetime.toISOString(),
        date: dateStr,
        time: timeStr,
        status: appt.status,
        reason,
        code,
    }
}

function detectResponsibleOverlaps(
    futureAppointments: FutureActiveAppointment[],
    listedIds: Set<string>,
    currentSlotMinutes: number | null,
    newSlotMinutes: number,
): ScheduleConflictItem[] {
    const confirmed = futureAppointments.filter(
        (a) => a.status === "CONFIRMED" && a.assignedUserId !== null,
    )
    const candidates = confirmed
        .filter((a) => !a.offGrid)
        .sort((a, b) => byRequestOrder(b, a))
    const items: ScheduleConflictItem[] = []

    for (const appt of candidates) {
        if (listedIds.has(appt.id)) {
            continue
        }
        const partner = confirmed
            .filter(
                (other) =>
                    other.id !== appt.id &&
                    other.assignedUserId === appt.assignedUserId &&
                    !listedIds.has(other.id) &&
                    !overlaps(appt.appointmentDatetime, other.appointmentDatetime, currentSlotMinutes) &&
                    overlaps(appt.appointmentDatetime, other.appointmentDatetime, newSlotMinutes),
            )
            .sort(byAppointmentOrder)[0]
        if (!partner) {
            continue
        }
        listedIds.add(appt.id)
        items.push({
            ...conflictItemOf(
                appt,
                "RESPONSIBLE_OVERLAP",
                `Responsável com outro agendamento sobreposto com atendimentos de ${newSlotMinutes} minutos (protocolo ${partner.protocol})`,
            ),
            conflictingAppointmentId: partner.id,
            conflictingProtocol: partner.protocol,
        })
    }

    return items
}

export interface ScheduleFieldIssue {
    path: string
    message: string
}

export interface BlockVigency {
    today: string
    start: string
    next: string | null
}

function dayMonthOf(dateStr: string): string {
    const [, month, day] = dateStr.split("-")
    return `${day}/${month}`
}

function blockKeyOf(block: Pick<BlockedDateItem, "date"> & { startTime?: string | null; endTime?: string | null }): string {
    return `${block.date} ${block.startTime?.slice(0, 5) ?? ""} ${block.endTime?.slice(0, 5) ?? ""}`
}

export function blockVigencyIssues(
    blocks: (Pick<BlockedDateItem, "date"> & { startTime?: string | null; endTime?: string | null })[],
    reference: BlockedDateItem[],
    { today, start, next }: BlockVigency,
): ScheduleFieldIssue[] {
    const kept = new Set(reference.map(blockKeyOf))
    const issues: ScheduleFieldIssue[] = []
    blocks.forEach((block, index) => {
        if (block.date < today || kept.has(blockKeyOf(block))) {
            return
        }
        if (block.date < start) {
            issues.push({
                path: `blockedDates.${index}.date`,
                message: `Esta data vem antes do início desta mudança (${dayMonthOf(start)}). Bloqueie na configuração que vale nessa data.`,
            })
        } else if (next !== null && block.date >= next) {
            issues.push({
                path: `blockedDates.${index}.date`,
                message: `Esta data segue a mudança de ${dayMonthOf(next)}. Bloqueie lá.`,
            })
        }
    })
    return issues
}

export function appointmentsInScheduleInterval(
    appointments: FutureActiveAppointment[],
    fromDate: string,
    nextDate: string | null,
): FutureActiveAppointment[] {
    return appointments.filter((appointment) => {
        const { dateStr } = getLocalParts(appointment.appointmentDatetime)
        return dateStr >= fromDate && (nextDate === null || dateStr < nextDate)
    })
}

export function detectScheduleConflicts(
    config: NormalizedScheduleConfig,
    futureAppointments: FutureActiveAppointment[],
    currentSlotMinutes: number | null,
): ScheduleConflictItem[] {
    const conflicts: ScheduleConflictItem[] = []
    const bySlot = new Map<string, { appt: FutureActiveAppointment; date: string; time: string }[]>()

    const dbRanges = config.ranges.map((r, idx) => ({
        id: idx + 1,
        weekday: r.weekday,
        slot_index: r.slotIndex,
        start_time: r.startTime,
        end_time: r.endTime,
    }))

    for (const appt of futureAppointments.filter((a) => !a.offGrid)) {
        const { dateStr, timeStr } = getLocalParts(appt.appointmentDatetime)
        const apptMin = toMinutes(timeStr)
        const dow = getDowFromDateStr(dateStr)

        const fullBlock = config.blockedDates.find(
            (b) => b.date === dateStr && (!b.startTime || !b.endTime),
        )
        const partialBlock = config.blockedDates.find((b) => {
            if (b.date !== dateStr || !b.startTime || !b.endTime) {
                return false
            }
            const bStart = toMinutes(b.startTime)
            const bEnd = toMinutes(b.endTime)
            return apptMin < bEnd && apptMin + config.slotMinutes > bStart
        })

        const rangesForDay = config.ranges.filter((r) => r.weekday === dow)
        const validStarts = slotsForWeekday(dow, dbRanges, config.slotMinutes)

        let code: ScheduleConflictCode | null = null
        let reason: string | null = null

        if (fullBlock) {
            code = "DATE_BLOCKED"
            reason = `Data bloqueada: ${fullBlock.description}`
        } else if (partialBlock) {
            code = "PERIOD_BLOCKED"
            reason = `Período bloqueado (${partialBlock.startTime}–${partialBlock.endTime})`
        } else if (rangesForDay.length === 0) {
            code = "DAY_WITHOUT_SERVICE"
            reason = "Dia sem atendimento na nova grade"
        } else if (!validStarts.includes(apptMin)) {
            const inRange = rangesForDay.some(
                (r) => apptMin >= toMinutes(r.startTime) && apptMin < toMinutes(r.endTime),
            )
            if (inRange) {
                code = "DURATION_CHANGED"
                reason = `Horário deixou de existir com atendimentos de ${config.slotMinutes} minutos`
            } else {
                code = "RANGE_CHANGED"
                reason = "Faixa de horário removida ou alterada"
            }
        }

        if (code && reason) {
            conflicts.push(conflictItemOf(appt, code, reason))
        } else {
            const slotKey = `${dateStr} ${timeStr}`
            const list = bySlot.get(slotKey) ?? []
            list.push({ appt, date: dateStr, time: timeStr })
            bySlot.set(slotKey, list)
        }
    }

    for (const list of bySlot.values()) {
        if (list.length > config.seatsPerSlot) {
            const ordered = [...list].sort((a, b) => byRequestOrder(a.appt, b.appt))
            const affected = ordered.slice(config.seatsPerSlot)
            for (const { appt, date, time } of affected) {
                conflicts.push({
                    id: appt.id,
                    protocol: appt.protocol,
                    name: appt.name,
                    cpfMasked: appt.cpfMasked,
                    appointmentDatetime: appt.appointmentDatetime.toISOString(),
                    date,
                    time,
                    status: appt.status,
                    reason: `Vagas reduzidas para ${config.seatsPerSlot}; este horário tem ${list.length} agendamentos`,
                    code: "SEATS_REDUCED",
                })
            }
        }
    }

    conflicts.push(
        ...detectResponsibleOverlaps(
            futureAppointments,
            new Set(conflicts.map((c) => c.id)),
            currentSlotMinutes,
            config.slotMinutes,
        ),
    )

    return conflicts.sort(
        (a, b) =>
            new Date(a.appointmentDatetime).getTime() - new Date(b.appointmentDatetime).getTime() ||
            Number(a.id) - Number(b.id),
    )
}

export function getMonthDateBounds(month: string): { firstDateStr: string; lastDateStr: string } {
    const [y, m] = month.split("-").map(Number)
    const firstDateStr = `${month}-01`
    const lastDay = new Date(Date.UTC(y!, m!, 0)).getUTCDate()
    const lastDateStr = `${month}-${String(lastDay).padStart(2, "0")}`
    return { firstDateStr, lastDateStr }
}

export interface CalculateMonthlyPreviewInput {
    month: string
    now: Date
    settings: Pick<
        ScheduleSettings,
        "slot_minutes" | "seats_per_slot" | "window_days" | "min_notice_days"
    >
    ranges: Pick<ScheduleRange, "weekday" | "slot_index" | "start_time" | "end_time">[]
    blockedDates: Pick<BlockedDate, "date" | "start_time" | "end_time" | "description">[]
    activeCounts: Map<string, number>
    windowBounds?: WindowBounds
}

export function calculateMonthlyPreview({
    month,
    now,
    settings,
    ranges,
    blockedDates,
    activeCounts,
    windowBounds,
}: CalculateMonthlyPreviewInput): MonthlyGridPreview {
    const { dateStr: todayStr, timeStr: nowTimeStr } = getLocalParts(now)
    const nowMinutes = toMinutes(nowTimeStr)

    const { startDateStr, endDateStr, hasValidStart } = windowBounds ?? computeWindowBounds(
        todayStr,
        settings,
        ranges,
        blockedDates,
    )

    let totalWindowSlots = 0
    let totalWindowSeats = 0
    let usedWindowSeats = 0

    if (hasValidStart) {
        let curr = startDateStr
        while (curr <= endDateStr) {
            const starts = freeSlotStartsOfDay(curr, ranges, blockedDates, settings.slot_minutes)
            for (const t of starts) {
                if (curr === todayStr && t <= nowMinutes) {
                    continue
                }
                const slotTimeStr = fromMinutes(t)
                const dt = parseLocalDate(curr, slotTimeStr)
                const rawUsed = activeCounts.get(dt.toISOString()) ?? 0
                const used = Math.min(settings.seats_per_slot, rawUsed)

                totalWindowSlots += 1
                totalWindowSeats += settings.seats_per_slot
                usedWindowSeats += used
            }
            curr = addDaysToDateString(curr, 1)
        }
    }

    const freeWindowSeats = totalWindowSeats - usedWindowSeats

    const weekdays: WeekdayPreview[] = [0, 1, 2, 3, 4, 5, 6].map((weekday) => {
        const starts = slotsForWeekday(weekday, ranges, settings.slot_minutes)
        const slots = starts.map(fromMinutes)
        return {
            weekday,
            slots,
            totalSlots: slots.length,
            totalSeats: slots.length * settings.seats_per_slot,
        }
    })

    const { firstDateStr, lastDateStr } = getMonthDateBounds(month)
    const days: DayPreview[] = []
    let d = firstDateStr

    while (d <= lastDateStr) {
        const dow = getDowFromDateStr(d)
        const weekdayStarts = slotsForWeekday(dow, ranges, settings.slot_minutes)
        const freeStarts = freeSlotStartsOfDay(d, ranges, blockedDates, settings.slot_minutes)

        const fullBlock = blockedDates.find(
            (b) => b.date === d && (!b.start_time || !b.end_time),
        )
        const partialBlocks = blockedDates.filter(
            (b) => b.date === d && b.start_time && b.end_time,
        )

        const blockDescription = fullBlock
            ? fullBlock.description
            : partialBlocks.length > 0
              ? partialBlocks
                    .map(
                        (b) =>
                            `Período bloqueado (${trimTime(b.start_time!)}–${trimTime(b.end_time!)}): ${b.description}`,
                    )
                    .join("; ")
              : null

        let status: DayPreviewStatus
        if (d < todayStr) {
            status = "PAST"
        } else if (d > endDateStr) {
            status = "OUTSIDE_WINDOW"
        } else if (fullBlock || (freeStarts.length === 0 && weekdayStarts.length > 0)) {
            status = "BLOCKED"
        } else if (freeStarts.length === 0) {
            status = "NO_SERVICE"
        } else if (!hasValidStart || d < startDateStr) {
            status = "BEFORE_MIN_NOTICE"
        } else if (d === todayStr && freeStarts.every((t) => t <= nowMinutes)) {
            status = "CLOSED_TODAY"
        } else {
            status = "AVAILABLE"
        }

        const isOfferableDay = status === "AVAILABLE"
        let dayCapacity = 0
        let dayUsed = 0

        const slots: DaySlotPreview[] = freeStarts.map((t) => {
            const time = fromMinutes(t)
            const dt = parseLocalDate(d, time)
            const past = d < todayStr || (d === todayStr && t <= nowMinutes)
            const offered = isOfferableDay && !past
            const rawUsed = activeCounts.get(dt.toISOString()) ?? 0
            const usedSeats = Math.min(settings.seats_per_slot, rawUsed)
            const freeSeats = Math.max(0, settings.seats_per_slot - rawUsed)

            if (offered) {
                dayCapacity += settings.seats_per_slot
                dayUsed += usedSeats
            }

            return {
                time,
                capacity: settings.seats_per_slot,
                usedSeats,
                freeSeats,
                offered,
                past,
            }
        })

        const dayFree = dayCapacity - dayUsed
        if (status === "AVAILABLE" && dayFree === 0) {
            status = "FULL"
        }

        days.push({
            date: d,
            weekday: dow,
            status,
            totalSlots: isOfferableDay ? slots.filter((s) => s.offered).length : slots.length,
            capacity: dayCapacity,
            usedSeats: dayUsed,
            freeSeats: dayFree,
            blockDescription,
            slots,
        })

        d = addDaysToDateString(d, 1)
    }

    return {
        month,
        today: todayStr,
        windowStart: startDateStr,
        windowEnd: endDateStr,
        totalWindowSlots,
        totalWindowSeats,
        usedWindowSeats,
        freeWindowSeats,
        weekdays,
        days,
    }
}
