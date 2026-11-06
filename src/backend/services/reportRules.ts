import type {
    AppointmentsResultCounts,
    AppointmentsResultSummary,
    OutcomeCountRow,
    OutcomeSummaryItem,
    ReportPeriodPreset,
    ReportQueryInput,
    ResolvedReportPeriod,
    SessionOutcome,
} from "../types/report.types"
import {
    addDaysToDateString,
    parseLocalDate,
    toLocalDateString,
} from "../utils/date.utils"

export const OUTCOME_DEFINITIONS: readonly {
    outcome: SessionOutcome
    label: string
}[] = [
    { outcome: "RESOLVED", label: "Resolvida sem agendamento" },
    { outcome: "SCHEDULED", label: "Terminou em agendamento" },
    { outcome: "OUT_OF_SCOPE", label: "Fora do escopo do PROCON" },
    {
        outcome: "NO_SLOT",
        label: "Sem horário disponível na janela",
    },
    {
        outcome: "DECLINED",
        label: "Não quis agendar",
    },
    {
        outcome: "MANAGED_APPOINTMENT",
        label: "Remarcou ou cancelou agendamento existente",
    },
    { outcome: "ABANDONED", label: "Abandonada" },
    { outcome: "IN_PROGRESS", label: "Em andamento" },
]

export function roundOneDecimal(value: number): number {
    return Math.round(value * 10) / 10
}

export function calculatePercentage(part: number, total: number): number {
    if (total <= 0 || part <= 0) {
        return 0
    }
    return roundOneDecimal((part / total) * 100)
}

export function countCalendarDaysInclusive(
    startDate: string,
    endDate: string,
): number {
    const [sy, sm, sd] = startDate.split("-").map(Number)
    const [ey, em, ed] = endDate.split("-").map(Number)
    const startUtc = Date.UTC(sy!, sm! - 1, sd!, 12, 0, 0)
    const endUtc = Date.UTC(ey!, em! - 1, ed!, 12, 0, 0)
    return Math.round((endUtc - startUtc) / 86_400_000) + 1
}

function resolveDatesForPreset(
    preset: Exclude<ReportPeriodPreset, "custom">,
    today: string,
): { startDate: string; endDate: string } {
    const yesterday = addDaysToDateString(today, -1)
    if (preset === "7d") {
        return { startDate: addDaysToDateString(today, -7), endDate: yesterday }
    }
    if (preset === "30d") {
        return { startDate: addDaysToDateString(today, -30), endDate: yesterday }
    }
    if (preset === "90d") {
        return { startDate: addDaysToDateString(today, -90), endDate: yesterday }
    }
    if (preset === "current_month") {
        return { startDate: `${today.slice(0, 8)}01`, endDate: today }
    }
    const firstOfCurrentMonth = `${today.slice(0, 8)}01`
    const lastOfPreviousMonth = addDaysToDateString(firstOfCurrentMonth, -1)
    return {
        startDate: `${lastOfPreviousMonth.slice(0, 8)}01`,
        endDate: lastOfPreviousMonth,
    }
}

export function resolveReportPeriod(
    input: ReportQueryInput = {},
    now: Date = new Date(),
): ResolvedReportPeriod {
    const today = toLocalDateString(now)
    const hasCustomDates =
        input.startDate !== undefined || input.endDate !== undefined
    const preset: ReportPeriodPreset =
        input.period ?? (hasCustomDates ? "custom" : "30d")

    const { startDate, endDate } =
        preset === "custom"
            ? { startDate: input.startDate!, endDate: input.endDate! }
            : resolveDatesForPreset(preset, today)

    const daysCount = countCalendarDaysInclusive(startDate, endDate)
    const start = parseLocalDate(startDate, "00:00")
    const endExclusive = parseLocalDate(addDaysToDateString(endDate, 1), "00:00")

    return {
        preset,
        startDate,
        endDate,
        daysCount,
        today,
        start,
        endExclusive,
    }
}

export function buildOutcomesSummary(
    rows: OutcomeCountRow[],
    totalConversations: number,
): OutcomeSummaryItem[] {
    const countMap = new Map<SessionOutcome, number>()
    for (const row of rows) {
        countMap.set(row.outcome, (countMap.get(row.outcome) ?? 0) + row.count)
    }

    const visibleDefs = OUTCOME_DEFINITIONS.filter((def) => {
        if (def.outcome === "IN_PROGRESS") {
            return (countMap.get("IN_PROGRESS") ?? 0) > 0
        }
        return true
    })

    if (totalConversations <= 0) {
        return visibleDefs.map((def) => ({
            outcome: def.outcome,
            label: def.label,
            count: 0,
            percentage: 0,
        }))
    }

    const entries = visibleDefs.map((def, index) => {
        const count = countMap.get(def.outcome) ?? 0
        const exactTenths = (count * 1000) / totalConversations
        const floorTenths = Math.floor(exactTenths)
        return {
            def,
            index,
            count,
            tenths: floorTenths,
            remainder: exactTenths - floorTenths,
        }
    })

    let remainingTenths =
        1000 - entries.reduce((sum, entry) => sum + entry.tenths, 0)

    const sortedByRemainder = [...entries]
        .filter((entry) => entry.count > 0)
        .sort((a, b) => {
            if (b.remainder !== a.remainder) {
                return b.remainder - a.remainder
            }
            if (b.count !== a.count) {
                return b.count - a.count
            }
            return a.index - b.index
        })

    for (let i = 0; i < sortedByRemainder.length && remainingTenths > 0; i++) {
        sortedByRemainder[i]!.tenths += 1
        remainingTenths -= 1
    }

    return entries.map((entry) => ({
        outcome: entry.def.outcome,
        label: entry.def.label,
        count: entry.count,
        percentage: entry.tenths / 10,
    }))
}

export function calculateNoShowRate(attended: number, noShow: number): number {
    return calculatePercentage(noShow, attended + noShow)
}

export function buildAppointmentsResultSummary(
    counts: AppointmentsResultCounts,
): AppointmentsResultSummary {
    const total =
        counts.attended +
        counts.noShow +
        counts.canceled +
        counts.waitingRecord +
        counts.upcoming
    const recordedTotal = counts.attended + counts.noShow

    return {
        attended: counts.attended,
        noShow: counts.noShow,
        canceled: counts.canceled,
        waitingRecord: counts.waitingRecord,
        upcoming: counts.upcoming,
        total,
        recordedTotal,
        noShowRate: calculateNoShowRate(counts.attended, counts.noShow),
    }
}
