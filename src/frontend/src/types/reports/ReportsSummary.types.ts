import type ReportPeriodPreset from "@/types/reports/ReportPeriodPreset.types"

type ReportOutcome =
    | "RESOLVED"
    | "SCHEDULED"
    | "OUT_OF_SCOPE"
    | "NO_SLOT"
    | "DECLINED"
    | "MANAGED_APPOINTMENT"
    | "ABANDONED"
    | "IN_PROGRESS"

type ReportsSummary = {
    period: {
        preset: ReportPeriodPreset
        startDate: string
        endDate: string
        daysCount: number
        today: string
    }
    conversations: {
        total: number
        dailyAverage: number
        appointmentsCreated: number
    }
    outcomes: {
        outcome: ReportOutcome
        label: string
        count: number
        percentage: number
    }[]
    topCategories: {
        categoryId: string
        title: string
        conversationsCount: number
    }[]
    topQuestions: {
        questionId: string
        question: string
        shortTitle: string | null
        categoryId: string
        categoryTitle: string
        conversationsCount: number
    }[]
    appointmentsResult: {
        attended: number
        noShow: number
        canceled: number
        waitingRecord: number
        upcoming: number
        total: number
        recordedTotal: number
        noShowRate: number
    }
}

export type { ReportOutcome }
export default ReportsSummary
