import { reportRepository } from "../repositories/report.repository"
import { IReportRepository } from "../repositories/report.repository.interface"
import type {
    ReportQueryInput,
    ReportsSummaryView,
} from "../types/report.types"
import {
    buildAbandonmentFunnel,
    buildAppointmentsResultSummary,
    buildConversationSeries,
    buildDailySeries,
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
            dailyRows,
            topCategories,
            topQuestions,
            appointmentCounts,
            abandonedStepRows,
        ] = await Promise.all([
            repository.getOutcomesCount(period.start, period.endExclusive),
            repository.getDailyConversations(period.start, period.endExclusive),
            repository.getTopCategories(period.start, period.endExclusive),
            repository.getTopQuestions(period.start, period.endExclusive),
            repository.getAppointmentsResultCounts(
                period.start,
                period.endExclusive,
                now,
            ),
            repository.getAbandonedByStep(period.start, period.endExclusive),
        ])

        const totalConversations = outcomeRows.reduce(
            (sum, row) => sum + row.count,
            0,
        )
        const dailySeries = buildDailySeries(
            period.startDate,
            period.endDate,
            dailyRows,
        )
        const appointmentsCreated = dailySeries.reduce(
            (sum, day) => sum + day.appointmentsCreated,
            0,
        )
        const dailyAverage =
            period.daysCount > 0
                ? roundOneDecimal(totalConversations / period.daysCount)
                : 0

        const outcomes = buildOutcomesSummary(outcomeRows, totalConversations)
        const { granularity: seriesGranularity, buckets: series } =
            buildConversationSeries(dailySeries)
        const appointmentsResult =
            buildAppointmentsResultSummary(appointmentCounts)
        const abandonmentFunnel = buildAbandonmentFunnel(
            abandonedStepRows,
            totalConversations,
        )

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
            dailySeries,
            seriesGranularity,
            series,
            topCategories,
            topQuestions,
            appointmentsResult,
            abandonmentFunnel,
        }
    }

    return {
        getSummary,
    }
}

export const reportService: IReportService = createReportService()
