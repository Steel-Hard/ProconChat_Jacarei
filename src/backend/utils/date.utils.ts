export function parseDate(value: string | Date): Date {
    return value instanceof Date ? value : new Date(value)
}

export function toLocalDateString(date: Date = new Date()): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date)
}

export function addDaysToDateString(dateStr: string, days: number): string {
    const d = new Date(`${dateStr}T12:00:00-03:00`)
    d.setDate(d.getDate() + days)
    return toLocalDateString(d)
}

export function isDateOnOrBeforeToday(appointmentDate: Date, now: Date = new Date()): boolean {
    const apptDateStr = toLocalDateString(appointmentDate)
    const todayStr = toLocalDateString(now)
    return apptDateStr <= todayStr
}

export function isDatetimePast(appointmentDatetime: Date, now: Date = new Date()): boolean {
    return appointmentDatetime.getTime() <= now.getTime()
}

export function getTodayBounds(now: Date = new Date()): { start: Date; end: Date } {
    const dateStr = toLocalDateString(now)
    const start = new Date(`${dateStr}T00:00:00-03:00`)
    const end = new Date(`${dateStr}T23:59:59.999-03:00`)
    return { start, end }
}

function getDayOfWeekInSaoPaulo(date: Date): number {
    const weekday = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Sao_Paulo",
        weekday: "short",
    }).format(date)
    const map: Record<string, number> = {
        Sun: 0,
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6,
    }
    return map[weekday] ?? 0
}

export function getThisWeekBounds(now: Date = new Date()): { start: Date; end: Date } {
    const dateStr = toLocalDateString(now)
    const baseDate = new Date(`${dateStr}T12:00:00-03:00`)
    const dayOfWeek = getDayOfWeekInSaoPaulo(baseDate)

    const startDate = new Date(baseDate.getTime() - dayOfWeek * 24 * 60 * 60 * 1000)
    const endDate = new Date(baseDate.getTime() + (6 - dayOfWeek) * 24 * 60 * 60 * 1000)

    const startStr = toLocalDateString(startDate)
    const endStr = toLocalDateString(endDate)

    return {
        start: new Date(`${startStr}T00:00:00-03:00`),
        end: new Date(`${endStr}T23:59:59.999-03:00`),
    }
}
