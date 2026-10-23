import BadRequestError from "../errors/BadRequestError"
import { isValidCalendarDate } from "../schemas/schedule.schema"
import type {
    BlockedDate,
    BlockedDateItem,
    DayPreview,
    DayPreviewStatus,
    DaySlotPreview,
    FutureActiveAppointment,
    MonthlyPreviewResult,
    NormalizedScheduleConfig,
    ScheduleConfigInput,
    ScheduleConflictCode,
    ScheduleConflictItem,
    ScheduleRange,
    ScheduleRangeItem,
    ScheduleSettings,
    WeekdayPreview,
} from "../types/schedule.types"
import { addDaysToDateString, getLocalParts, parseLocalDate } from "../utils/date.utils"

const VALID_SLOT_MINUTES = new Set([20, 30, 40, 60])
const VALID_MIN_NOTICE_DAYS = new Set([0, 1, 2, 3, 5])
const VALID_REMINDER_HOURS = new Set([2, 6, 12, 24, 48])
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

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

export function computeWindowBounds(
    todayStr: string,
    settings: Pick<ScheduleSettings, "window_days" | "min_notice_days" | "slot_minutes">,
    ranges: Pick<ScheduleRange, "weekday" | "slot_index" | "start_time" | "end_time">[],
    blockedDates: Pick<BlockedDate, "date" | "start_time" | "end_time">[],
): WindowBounds {
    const endDateStr = addDaysToDateString(todayStr, settings.window_days)
    if (ranges.length === 0) {
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
            if (isBusinessDay(d, ranges, blockedDates, settings.slot_minutes)) {
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

export function normalizeAndValidateScheduleConfig(
    input: ScheduleConfigInput,
): NormalizedScheduleConfig {
    if (!VALID_SLOT_MINUTES.has(input.slotMinutes)) {
        throw new BadRequestError("Duração deve ser 20, 30, 40 ou 60 minutos")
    }
    if (!Number.isInteger(input.seatsPerSlot) || input.seatsPerSlot < 1 || input.seatsPerSlot > 20) {
        throw new BadRequestError("Vagas por horário devem estar entre 1 e 20")
    }
    if (!Number.isInteger(input.windowDays) || input.windowDays < 1 || input.windowDays > 180) {
        throw new BadRequestError("Janela de agendamento deve estar entre 1 e 180 dias")
    }
    if (!VALID_MIN_NOTICE_DAYS.has(input.minNoticeDays)) {
        throw new BadRequestError("Antecedência mínima deve ser 0, 1, 2, 3 ou 5 dias úteis")
    }
    if (!Number.isInteger(input.waitAlertDays) || input.waitAlertDays < 1 || input.waitAlertDays > 60) {
        throw new BadRequestError("Alerta de espera deve estar entre 1 e 60 dias")
    }

    const unitAddress = input.unitAddress.trim()
    if (unitAddress.length === 0 || unitAddress.length > 500) {
        throw new BadRequestError("Endereço da unidade obrigatório")
    }

    const rawComplement = input.unitAddressComplement?.trim() ?? ""
    if (rawComplement.length > 500) {
        throw new BadRequestError("Complemento deve ter no máximo 500 caracteres")
    }
    const unitAddressComplement = rawComplement.length > 0 ? rawComplement : null

    if (typeof input.reminderEnabled !== "boolean") {
        throw new BadRequestError("Configuração de lembrete inválida")
    }
    if (!VALID_REMINDER_HOURS.has(input.reminderHours)) {
        throw new BadRequestError("Horas do lembrete devem ser 2, 6, 12, 24 ou 48")
    }

    const byWeekday = new Map<number, ScheduleRangeItem[]>()
    for (const rawRange of input.ranges) {
        if (!Number.isInteger(rawRange.weekday) || rawRange.weekday < 0 || rawRange.weekday > 6) {
            throw new BadRequestError("Dia da semana inválido")
        }
        const startTime = trimTime(rawRange.startTime)
        const endTime = trimTime(rawRange.endTime)
        if (!TIME_REGEX.test(startTime) || !TIME_REGEX.test(endTime)) {
            throw new BadRequestError("Horário deve estar no formato HH:MM")
        }
        const startMin = toMinutes(startTime)
        const endMin = toMinutes(endTime)
        if (endMin <= startMin) {
            throw new BadRequestError("O fim deve ser depois do início")
        }
        if (endMin - startMin < input.slotMinutes) {
            throw new BadRequestError(
                `Esta faixa não comporta nenhum atendimento de ${input.slotMinutes} minutos`,
            )
        }
        const list = byWeekday.get(rawRange.weekday) ?? []
        if (list.length >= 3) {
            throw new BadRequestError("Cada dia da semana pode ter no máximo 3 faixas de horário")
        }
        list.push({
            weekday: rawRange.weekday,
            slotIndex: rawRange.slotIndex ?? list.length + 1,
            startTime,
            endTime,
        })
        byWeekday.set(rawRange.weekday, list)
    }

    const normalizedRanges: ScheduleRangeItem[] = []
    for (let dow = 0; dow <= 6; dow++) {
        const list = byWeekday.get(dow) ?? []
        for (let i = 0; i < list.length; i++) {
            for (let j = i + 1; j < list.length; j++) {
                const a = list[i]!
                const b = list[j]!
                if (
                    Math.max(toMinutes(a.startTime), toMinutes(b.startTime)) <
                    Math.min(toMinutes(a.endTime), toMinutes(b.endTime))
                ) {
                    throw new BadRequestError("Esta faixa se sobrepõe a outra faixa do mesmo dia")
                }
            }
        }
        const sorted = [...list].sort(
            (a, b) => toMinutes(a.startTime) - toMinutes(b.startTime),
        )
        sorted.forEach((item, index) => {
            normalizedRanges.push({
                weekday: item.weekday,
                slotIndex: index + 1,
                startTime: item.startTime,
                endTime: item.endTime,
            })
        })
    }

    const normalizedBlocks: BlockedDateItem[] = []
    for (const rawBlock of input.blockedDates) {
        const date = rawBlock.date.trim()
        if (!isValidCalendarDate(date)) {
            throw new BadRequestError("Data bloqueada inválida")
        }
        const description = rawBlock.description.trim()
        if (description.length === 0 || description.length > 150) {
            throw new BadRequestError("Descrição do bloqueio obrigatória (até 150 caracteres)")
        }
        const hasStart = rawBlock.startTime !== undefined && rawBlock.startTime !== null
        const hasEnd = rawBlock.endTime !== undefined && rawBlock.endTime !== null
        if (hasStart !== hasEnd) {
            throw new BadRequestError("Bloqueio parcial exige horário inicial e final")
        }
        let startTime: string | null = null
        let endTime: string | null = null
        if (hasStart && hasEnd) {
            startTime = trimTime(rawBlock.startTime!)
            endTime = trimTime(rawBlock.endTime!)
            if (!TIME_REGEX.test(startTime) || !TIME_REGEX.test(endTime)) {
                throw new BadRequestError("Horário do bloqueio inválido")
            }
            if (toMinutes(endTime) <= toMinutes(startTime)) {
                throw new BadRequestError("O fim do bloqueio deve ser depois do início")
            }
        }
        normalizedBlocks.push({ date, startTime, endTime, description })
    }

    const blocksByDate = new Map<string, BlockedDateItem[]>()
    for (const block of normalizedBlocks) {
        const existing = blocksByDate.get(block.date) ?? []
        for (const other of existing) {
            const blockFull = !block.startTime || !block.endTime
            const otherFull = !other.startTime || !other.endTime
            if (blockFull || otherFull) {
                throw new BadRequestError("Esta data já tem um bloqueio")
            }
            if (
                Math.max(toMinutes(block.startTime!), toMinutes(other.startTime!)) <
                Math.min(toMinutes(block.endTime!), toMinutes(other.endTime!))
            ) {
                throw new BadRequestError("Período bloqueado sobreposto na mesma data")
            }
        }
        existing.push(block)
        blocksByDate.set(block.date, existing)
    }

    normalizedBlocks.sort((a, b) =>
        `${a.date} ${a.startTime ?? ""}`.localeCompare(`${b.date} ${b.startTime ?? ""}`),
    )

    return {
        slotMinutes: input.slotMinutes,
        seatsPerSlot: input.seatsPerSlot,
        windowDays: input.windowDays,
        minNoticeDays: input.minNoticeDays,
        waitAlertDays: input.waitAlertDays,
        unitAddress,
        unitAddressComplement,
        reminderEnabled: input.reminderEnabled,
        reminderHours: input.reminderHours,
        ranges: normalizedRanges,
        blockedDates: normalizedBlocks,
    }
}

export function detectScheduleConflicts(
    config: NormalizedScheduleConfig,
    futureAppointments: FutureActiveAppointment[],
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

    for (const appt of futureAppointments) {
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
            conflicts.push({
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
            })
        } else {
            const slotKey = `${dateStr} ${timeStr}`
            const list = bySlot.get(slotKey) ?? []
            list.push({ appt, date: dateStr, time: timeStr })
            bySlot.set(slotKey, list)
        }
    }

    for (const list of bySlot.values()) {
        if (list.length > config.seatsPerSlot) {
            const ordered = [...list].sort(
                (a, b) =>
                    a.appt.requestDatetime.getTime() - b.appt.requestDatetime.getTime() ||
                    Number(a.appt.id) - Number(b.appt.id),
            )
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
}

export function calculateMonthlyPreview({
    month,
    now,
    settings,
    ranges,
    blockedDates,
    activeCounts,
}: CalculateMonthlyPreviewInput): MonthlyPreviewResult {
    const { dateStr: todayStr, timeStr: nowTimeStr } = getLocalParts(now)
    const nowMinutes = toMinutes(nowTimeStr)

    const { startDateStr, endDateStr, hasValidStart } = computeWindowBounds(
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
