import type {
    AbandonedStepCountRow,
    AppointmentsResultCounts,
    CategoryUsageItem,
    DailyConversationRow,
    OutcomeCountRow,
    QuestionUsageItem,
} from "../types/report.types"

export interface IReportRepository {
    getOutcomesCount(start: Date, endExclusive: Date): Promise<OutcomeCountRow[]>
    getDailyConversations(
        start: Date,
        endExclusive: Date,
    ): Promise<DailyConversationRow[]>
    getTopCategories(
        start: Date,
        endExclusive: Date,
    ): Promise<CategoryUsageItem[]>
    getTopQuestions(
        start: Date,
        endExclusive: Date,
        limit?: number,
    ): Promise<QuestionUsageItem[]>
    getAppointmentsResultCounts(
        start: Date,
        endExclusive: Date,
        now?: Date,
    ): Promise<AppointmentsResultCounts>
    getAbandonedByStep(
        start: Date,
        endExclusive: Date,
    ): Promise<AbandonedStepCountRow[]>
}
