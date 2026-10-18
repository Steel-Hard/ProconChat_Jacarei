import { IScheduleRepository } from "../repositories/schedule.repository.interface"
import {
    AvailableSlot,
    BlockedDate,
    BookAppointmentInput,
    BookAppointmentResult,
    ScheduleRange,
} from "../types/schedule.types"
import { getLocalParts, parseLocalDate } from "../utils/date.utils"

const WEEKDAYS_PT = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
]

export function toMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(":").map(Number)
    return (h ?? 0) * 60 + (m ?? 0)
}

export function fromMinutes(mins: number): string {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export function addDaysToDateStr(dateStr: string, days: number): string {
    const [y, m, d] = dateStr.split("-").map(Number)
    const dt = new Date(Date.UTC(y!, m! - 1, d! + days, 12, 0, 0))
    return dt.toISOString().slice(0, 10)
}

export function getDowFromDateStr(dateStr: string): number {
    const [y, m, d] = dateStr.split("-").map(Number)
    const dt = new Date(Date.UTC(y!, m! - 1, d!, 12, 0, 0))
    return dt.getUTCDay()
}

function freeSlotStartsOfDay(
    dateStr: string,
    ranges: ScheduleRange[],
    blockedDates: BlockedDate[],
    slotMinutes: number,
): number[] {
    const dow = getDowFromDateStr(dateStr)
    const rangesForDay = ranges
        .filter((r) => r.weekday === dow)
        .sort((a, b) => a.slot_index - b.slot_index)

    const fullDayBlocked = blockedDates.some(
        (b) => b.date === dateStr && (!b.start_time || !b.end_time),
    )

    if (rangesForDay.length === 0 || fullDayBlocked) {
        return []
    }

    const partialBlocks = blockedDates.filter(
        (b) => b.date === dateStr && b.start_time && b.end_time,
    )

    const starts: number[] = []

    for (const range of rangesForDay) {
        const startMin = toMinutes(range.start_time)
        const endMin = toMinutes(range.end_time)

        for (let t = startMin; t + slotMinutes <= endMin; t += slotMinutes) {
            const slotStart = t
            const slotEnd = t + slotMinutes
            const isBlocked = partialBlocks.some((p) => {
                const pStart = toMinutes(p.start_time!)
                const pEnd = toMinutes(p.end_time!)
                return slotStart < pEnd && slotEnd > pStart
            })

            if (!isBlocked) {
                starts.push(t)
            }
        }
    }

    return starts
}

function isBusinessDay(
    dateStr: string,
    ranges: ScheduleRange[],
    blockedDates: BlockedDate[],
    slotMinutes: number,
): boolean {
    return freeSlotStartsOfDay(dateStr, ranges, blockedDates, slotMinutes).length > 0
}

export interface IScheduleService {
    getAvailableSlots(now?: Date): Promise<AvailableSlot[]>
    bookSlot(input: BookAppointmentInput): Promise<BookAppointmentResult>
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

        const maxDateStr = addDaysToDateStr(todayStr, settings.window_days + 15)
        const blockedDates = await repository.getBlockedDates(
            todayStr,
            maxDateStr,
        )

        let startDateStr = todayStr
        if (settings.min_notice_days > 0) {
            let n = 0
            let d = todayStr
            let iterations = 0
            const maxIterations = settings.window_days + 30
            while (n < settings.min_notice_days && iterations < maxIterations) {
                iterations++
                d = addDaysToDateStr(d, 1)
                if (
                    isBusinessDay(
                        d,
                        ranges,
                        blockedDates,
                        settings.slot_minutes,
                    )
                ) {
                    n++
                }
            }
            if (n < settings.min_notice_days) {
                return []
            }
            startDateStr = d
        }

        const endDateStr = addDaysToDateStr(todayStr, settings.window_days)

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

            curr = addDaysToDateStr(curr, 1)
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

    return {
        getAvailableSlots,
        bookSlot,
    }
}
