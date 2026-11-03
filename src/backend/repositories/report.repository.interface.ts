import type {
    AppointmentsResultCounts,
    CategoryUsageItem,
    OutcomeCountRow,
    QuestionUsageItem,
} from "../types/report.types"

export interface IReportRepository {
    getOutcomesCount(start: Date, endExclusive: Date): Promise<OutcomeCountRow[]>
    getAppointmentsCreatedCount(
        start: Date,
        endExclusive: Date,
    ): Promise<number>
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
}
