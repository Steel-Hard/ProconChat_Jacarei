export function toLocalDateString(date: Date = new Date()): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date)
}

export function addDaysToDateString(dateStr: string, days: number): string {
    const [y, m, d] = dateStr.split("-").map(Number)
    return new Date(Date.UTC(y!, m! - 1, d! + days, 12, 0, 0)).toISOString().slice(0, 10)
}

export function getLocalParts(d: Date, timeZone = "America/Sao_Paulo"): {
    dateStr: string
    timeStr: string
    hour: number
    minute: number
} {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(d)

    let year = 0
    let month = 0
    let day = 0
    let hour = 0
    let minute = 0
    for (const part of parts) {
        if (part.type === "year") year = Number(part.value)
        if (part.type === "month") month = Number(part.value)
        if (part.type === "day") day = Number(part.value)
        if (part.type === "hour") hour = Number(part.value) % 24
        if (part.type === "minute") minute = Number(part.value)
    }

    const mm = String(month).padStart(2, "0")
    const dd = String(day).padStart(2, "0")
    const hh = String(hour).padStart(2, "0")
    const min = String(minute).padStart(2, "0")

    return {
        dateStr: `${year}-${mm}-${dd}`,
        timeStr: `${hh}:${min}`,
        hour,
        minute,
    }
}

export function parseLocalDate(
    dateStr: string,
    timeStr: string,
    timeZone = "America/Sao_Paulo",
): Date {
    const [y, m, d] = dateStr.split("-").map(Number)
    const [h, min] = timeStr.split(":").map(Number)
    const utcCandidate = new Date(Date.UTC(y!, m! - 1, d!, h!, min!, 0))
    const parts = getLocalParts(utcCandidate, timeZone)
    const [ly, lm, ld] = parts.dateStr.split("-").map(Number)
    const localAsUtc = Date.UTC(ly!, lm! - 1, ld!, parts.hour, parts.minute, 0)
    const offsetMs = localAsUtc - utcCandidate.getTime()
    return new Date(utcCandidate.getTime() - offsetMs)
}

export function isDateOnOrBeforeToday(appointmentDate: Date, now: Date = new Date()): boolean {
    const apptDateStr = toLocalDateString(appointmentDate)
    const todayStr = toLocalDateString(now)
    return apptDateStr <= todayStr
}

export function isDatetimePast(appointmentDatetime: Date, now: Date = new Date()): boolean {
    return appointmentDatetime.getTime() <= now.getTime()
}

function localDayRange(firstDay: string, days: number): { start: Date; end: Date } {
    const start = parseLocalDate(firstDay, "00:00")
    const nextStart = parseLocalDate(addDaysToDateString(firstDay, days), "00:00")
    return { start, end: new Date(nextStart.getTime() - 1) }
}

export function getTodayBounds(now: Date = new Date()): { start: Date; end: Date } {
    return localDayRange(toLocalDateString(now), 1)
}

export function getThisWeekBounds(now: Date = new Date()): { start: Date; end: Date } {
    const dateStr = toLocalDateString(now)
    const [y, m, d] = dateStr.split("-").map(Number)
    const dayOfWeek = new Date(Date.UTC(y!, m! - 1, d!, 12, 0, 0)).getUTCDay()
    return localDayRange(addDaysToDateString(dateStr, -dayOfWeek), 7)
}
