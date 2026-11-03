import type {
    AppointmentsResultCounts,
    CategoryUsageItem,
    OutcomeCountRow,
    QuestionUsageItem,
} from "../../types/report.types"
import { IReportRepository } from "../report.repository.interface"

export interface ReportStubOptions {
    outcomes?: OutcomeCountRow[]
    appointmentsCreated?: number
    topCategories?: CategoryUsageItem[]
    topQuestions?: QuestionUsageItem[]
    appointmentsResult?: AppointmentsResultCounts
}

export interface ReportStubCalls {
    getOutcomesCount: Array<{ start: Date; endExclusive: Date }>
    getAppointmentsCreatedCount: Array<{ start: Date; endExclusive: Date }>
    getTopCategories: Array<{ start: Date; endExclusive: Date }>
    getTopQuestions: Array<{
        start: Date
        endExclusive: Date
        limit?: number
    }>
    getAppointmentsResultCounts: Array<{
        start: Date
        endExclusive: Date
        now?: Date
    }>
}

const DEFAULT_APPOINTMENTS_RESULT: AppointmentsResultCounts = {
    attended: 0,
    noShow: 0,
    canceled: 0,
    waitingRecord: 0,
    upcoming: 0,
}

export function createReportStubRepository(
    options: ReportStubOptions = {},
): IReportRepository & {
    calls: ReportStubCalls
    setOptions(next: ReportStubOptions): void
} {
    let state: ReportStubOptions = { ...options }
    const calls: ReportStubCalls = {
        getOutcomesCount: [],
        getAppointmentsCreatedCount: [],
        getTopCategories: [],
        getTopQuestions: [],
        getAppointmentsResultCounts: [],
    }

    return {
        calls,

        setOptions(next: ReportStubOptions): void {
            state = { ...next }
        },

        async getOutcomesCount(
            start: Date,
            endExclusive: Date,
        ): Promise<OutcomeCountRow[]> {
            calls.getOutcomesCount.push({ start, endExclusive })
            return [...(state.outcomes ?? [])]
        },

        async getAppointmentsCreatedCount(
            start: Date,
            endExclusive: Date,
        ): Promise<number> {
            calls.getAppointmentsCreatedCount.push({ start, endExclusive })
            return state.appointmentsCreated ?? 0
        },

        async getTopCategories(
            start: Date,
            endExclusive: Date,
        ): Promise<CategoryUsageItem[]> {
            calls.getTopCategories.push({ start, endExclusive })
            return [...(state.topCategories ?? [])]
        },

        async getTopQuestions(
            start: Date,
            endExclusive: Date,
            limit?: number,
        ): Promise<QuestionUsageItem[]> {
            calls.getTopQuestions.push({ start, endExclusive, limit })
            return [...(state.topQuestions ?? [])]
        },

        async getAppointmentsResultCounts(
            start: Date,
            endExclusive: Date,
            now?: Date,
        ): Promise<AppointmentsResultCounts> {
            calls.getAppointmentsResultCounts.push({ start, endExclusive, now })
            return {
                ...DEFAULT_APPOINTMENTS_RESULT,
                ...(state.appointmentsResult ?? {}),
            }
        },
    }
}
