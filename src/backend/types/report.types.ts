import type { AbandonedStep, FinishedOutcome } from "./conversationEvent.types"

export type ReportPeriodPreset =
    | "7d"
    | "30d"
    | "90d"
    | "current_month"
    | "previous_month"
    | "custom"

export type SessionOutcome = FinishedOutcome | "ABANDONED" | "IN_PROGRESS"

export type AbandonmentStageKey =
    | "CATEGORIES"
    | "QUESTIONS"
    | "ANSWER"
    | "RESOLVED"
    | "ATTENDEE"
    | "SLOT"

export interface ReportQueryInput {
    period?: ReportPeriodPreset
    startDate?: string
    endDate?: string
}

export interface ResolvedReportPeriod {
    preset: ReportPeriodPreset
    startDate: string
    endDate: string
    daysCount: number
    today: string
    start: Date
    endExclusive: Date
}

export interface ReportPeriodView {
    preset: ReportPeriodPreset
    startDate: string
    endDate: string
    daysCount: number
    today: string
}

export interface ConversationsSummary {
    total: number
    dailyAverage: number
    appointmentsCreated: number
}

export interface OutcomeCountRow {
    outcome: SessionOutcome
    count: number
}

export interface OutcomeSummaryItem {
    outcome: SessionOutcome
    label: string
    count: number
    percentage: number
}

export interface DailyConversationRow {
    date: string
    conversations: number
    appointmentsCreated: number
}

export interface DailyConversationPoint {
    date: string
    conversations: number
    appointmentsCreated: number
}

export interface ConversationSeriesBucket {
    startDate: string
    endDate: string
    conversations: number
    appointmentsCreated: number
}

export interface CategoryUsageItem {
    categoryId: string
    title: string
    conversationsCount: number
}

export interface QuestionUsageItem {
    questionId: string
    question: string
    shortTitle: string | null
    categoryId: string
    categoryTitle: string
    conversationsCount: number
}

export interface AppointmentsResultCounts {
    attended: number
    noShow: number
    canceled: number
    waitingRecord: number
    upcoming: number
}

export interface AppointmentsResultSummary extends AppointmentsResultCounts {
    total: number
    recordedTotal: number
    noShowRate: number
}

export interface AbandonedStepCountRow {
    step: AbandonedStep
    count: number
}

export interface AbandonmentStageItem {
    stage: AbandonmentStageKey
    label: string
    count: number
    percentageOfTotal: number
    percentageOfAbandoned: number
}

export interface ReportsSummaryView {
    period: ReportPeriodView
    conversations: ConversationsSummary
    outcomes: OutcomeSummaryItem[]
    dailySeries: DailyConversationPoint[]
    seriesGranularity: "day" | "week"
    series: ConversationSeriesBucket[]
    topCategories: CategoryUsageItem[]
    topQuestions: QuestionUsageItem[]
    appointmentsResult: AppointmentsResultSummary
    abandonmentFunnel: AbandonmentStageItem[]
}
