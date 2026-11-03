import { reportRepository } from "../repositories/report.repository"
import { IReportRepository } from "../repositories/report.repository.interface"
import type {
    ReportQueryInput,
    ReportsSummaryView,
} from "../types/report.types"
import {
    buildAppointmentsResultSummary,
    buildOutcomesSummary,
    resolveReportPeriod,
    roundOneDecimal,
} from "./reportRules"

export interface IReportService {
    getSummary(
        query?: ReportQueryInput,
        now?: Date,
    ): Promise<ReportsSummaryView>
}

export function createReportService(
    repository: IReportRepository = reportRepository,
): IReportService {
    async function getSummary(
        query: ReportQueryInput = {},
        now: Date = new Date(),
    ): Promise<ReportsSummaryView> {
        const period = resolveReportPeriod(query, now)

        const [
            outcomeRows,
            appointmentsCreated,
            topCategories,
            topQuestions,
            appointmentCounts,
        ] = await Promise.all([
            repository.getOutcomesCount(period.start, period.endExclusive),
            repository.getAppointmentsCreatedCount(
                period.start,
                period.endExclusive,
            ),
            repository.getTopCategories(period.start, period.endExclusive),
            repository.getTopQuestions(period.start, period.endExclusive),
            repository.getAppointmentsResultCounts(
                period.start,
                period.endExclusive,
                now,
            ),
        ])

        const totalConversations = outcomeRows.reduce(
            (sum, row) => sum + row.count,
            0,
        )
        const dailyAverage =
            period.daysCount > 0
                ? roundOneDecimal(totalConversations / period.daysCount)
                : 0

        const outcomes = buildOutcomesSummary(outcomeRows, totalConversations)
        const appointmentsResult =
            buildAppointmentsResultSummary(appointmentCounts)

        return {
            period: {
                preset: period.preset,
                startDate: period.startDate,
                endDate: period.endDate,
                daysCount: period.daysCount,
                today: period.today,
            },
            conversations: {
                total: totalConversations,
                dailyAverage,
                appointmentsCreated,
            },
            outcomes,
            topCategories,
            topQuestions,
            appointmentsResult,
        }
    }

    return {
        getSummary,
    }
}

export const reportService: IReportService = createReportService()
