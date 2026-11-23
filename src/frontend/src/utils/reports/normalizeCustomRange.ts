type CustomRange = { startDate: string; endDate: string }

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

function isValidDate(value: string): boolean {
    const match = DATE_ONLY.exec(value)

    if (!match) {
        return false
    }

    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))

    return date.getUTCMonth() === Number(match[2]) - 1 && date.getUTCDate() === Number(match[3])
}

function normalizeCustomRange(start: string, end: string, today: string): CustomRange | null {
    if (!isValidDate(start) || !isValidDate(end)) {
        return null
    }

    const clampedStart = start > today ? today : start
    const clampedEnd = end > today ? today : end

    return clampedStart <= clampedEnd
        ? { startDate: clampedStart, endDate: clampedEnd }
        : { startDate: clampedEnd, endDate: clampedStart }
}

export default normalizeCustomRange
