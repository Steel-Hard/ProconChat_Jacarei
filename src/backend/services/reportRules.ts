import { createReportQuerySchema } from "../schemas/report.schema"
import type { AbandonedStep } from "../types/conversationEvent.types"
import type {
    AbandonedStepCountRow,
    AbandonmentStageItem,
    AbandonmentStageKey,
    AppointmentsResultCounts,
    AppointmentsResultSummary,
    ConversationSeriesBucket,
    DailyConversationPoint,
    DailyConversationRow,
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
import { validateSchema } from "../utils/validateSchema"

export const WEEKLY_SERIES_THRESHOLD_DAYS = 45

export const OUTCOME_DEFINITIONS: readonly {
    outcome: SessionOutcome
    label: string
}[] = [
    { outcome: "RESOLVED", label: "Resolvida sem agendamento" },
    { outcome: "SCHEDULED", label: "Terminou em agendamento" },
    { outcome: "OUT_OF_SCOPE", label: "Fora do escopo do PROCON" },
    {
        outcome: "NO_SLOT",
        label: "Não resolvida, sem agendamento — sem horário disponível na janela",
    },
    {
        outcome: "DECLINED",
        label: "Não resolvida, sem agendamento — cidadão não quis agendar",
    },
    {
        outcome: "MANAGED_APPOINTMENT",
        label: "Remarcou ou cancelou um agendamento existente",
    },
    { outcome: "ABANDONED", label: "Abandonada" },
    { outcome: "IN_PROGRESS", label: "Em andamento" },
]

export const ABANDONMENT_STAGES: readonly {
    stage: AbandonmentStageKey
    label: string
}[] = [
    { stage: "CATEGORIES", label: "Na lista de categorias" },
    { stage: "QUESTIONS", label: "Na lista de perguntas" },
    { stage: "ANSWER", label: "Aguardando a resposta" },
    { stage: "RESOLVED", label: "Na pergunta 'A dúvida foi resolvida?'" },
    { stage: "ATTENDEE", label: "Em quem vai comparecer" },
    { stage: "SLOT", label: "Na escolha do horário" },
]

export const STEP_TO_ABANDONMENT_STAGE: Record<
    AbandonedStep,
    AbandonmentStageKey
> = {
    AWAITING_CATEGORY: "CATEGORIES",
    AWAITING_RETURN_CHOICE: "CATEGORIES",
    AWAITING_CANCEL_CONFIRMATION: "CATEGORIES",
    AWAITING_QUESTION: "QUESTIONS",
    AWAITING_ANSWER: "ANSWER",
    AWAITING_RESOLVED: "RESOLVED",
    AWAITING_SCHEDULE_OFFER: "RESOLVED",
    AWAITING_ATTENDEE: "ATTENDEE",
    AWAITING_HOLDER_NAME: "ATTENDEE",
    AWAITING_HOLDER_CPF: "ATTENDEE",
    AWAITING_SLOT: "SLOT",
}

export function mapStepToAbandonmentStage(
    step: AbandonedStep,
): AbandonmentStageKey {
    return STEP_TO_ABANDONMENT_STAGE[step]
}

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
    const parsed = validateSchema(
        createReportQuerySchema(() => now),
        input,
        { withIssues: true },
    )
    const today = toLocalDateString(now)
    const hasCustomDates =
        parsed.startDate !== undefined || parsed.endDate !== undefined
    const preset: ReportPeriodPreset =
        parsed.period ?? (hasCustomDates ? "custom" : "30d")

    const { startDate, endDate } =
        preset === "custom"
            ? { startDate: parsed.startDate!, endDate: parsed.endDate! }
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

    return OUTCOME_DEFINITIONS.filter((def) => {
        if (def.outcome === "IN_PROGRESS") {
            return (countMap.get("IN_PROGRESS") ?? 0) > 0
        }
        return true
    }).map((def) => {
        const count = countMap.get(def.outcome) ?? 0
        return {
            outcome: def.outcome,
            label: def.label,
            count,
            percentage: calculatePercentage(count, totalConversations),
        }
    })
}

export function buildDailySeries(
    startDate: string,
    endDate: string,
    rows: DailyConversationRow[],
): DailyConversationPoint[] {
    const rowMap = new Map<string, DailyConversationRow>()
    for (const row of rows) {
        rowMap.set(row.date, row)
    }

    const series: DailyConversationPoint[] = []
    let current = startDate
    while (current <= endDate) {
        const row = rowMap.get(current)
        series.push({
            date: current,
            conversations: row?.conversations ?? 0,
            appointmentsCreated: row?.appointmentsCreated ?? 0,
        })
        current = addDaysToDateString(current, 1)
    }
    return series
}

export function buildConversationSeries(
    dailySeries: DailyConversationPoint[],
): {
    granularity: "day" | "week"
    buckets: ConversationSeriesBucket[]
} {
    if (dailySeries.length <= WEEKLY_SERIES_THRESHOLD_DAYS) {
        return {
            granularity: "day",
            buckets: dailySeries.map((day) => ({
                startDate: day.date,
                endDate: day.date,
                conversations: day.conversations,
                appointmentsCreated: day.appointmentsCreated,
            })),
        }
    }

    const buckets: ConversationSeriesBucket[] = []
    for (let i = 0; i < dailySeries.length; i += 7) {
        const chunk = dailySeries.slice(i, i + 7)
        const first = chunk[0]!
        const last = chunk[chunk.length - 1]!
        buckets.push({
            startDate: first.date,
            endDate: last.date,
            conversations: chunk.reduce((sum, d) => sum + d.conversations, 0),
            appointmentsCreated: chunk.reduce(
                (sum, d) => sum + d.appointmentsCreated,
                0,
            ),
        })
    }

    return {
        granularity: "week",
        buckets,
    }
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

export function buildAbandonmentFunnel(
    rows: AbandonedStepCountRow[],
    totalConversations: number,
): AbandonmentStageItem[] {
    const countByStage = new Map<AbandonmentStageKey, number>()
    let totalAbandoned = 0

    for (const row of rows) {
        const stage = mapStepToAbandonmentStage(row.step)
        countByStage.set(stage, (countByStage.get(stage) ?? 0) + row.count)
        totalAbandoned += row.count
    }

    return ABANDONMENT_STAGES.map((def) => {
        const count = countByStage.get(def.stage) ?? 0
        return {
            stage: def.stage,
            label: def.label,
            count,
            percentageOfTotal: calculatePercentage(count, totalConversations),
            percentageOfAbandoned: calculatePercentage(count, totalAbandoned),
        }
    })
}
