import formatDate from "@/utils/formatDate"

type ReportPeriodRange = { start: string; end: string; untilNow: boolean }

function reportPeriodRange(startDate: string, endDate: string, today: string): ReportPeriodRange {
    const start = formatDate(startDate) ?? startDate
    const end = formatDate(endDate) ?? endDate
    const sameYear = startDate.slice(0, 4) === endDate.slice(0, 4)

    return {
        start: sameYear ? start.slice(0, 5) : start,
        end,
        untilNow: endDate === today
    }
}

export default reportPeriodRange
