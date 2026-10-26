import type {
    AbandonedStepCountRow,
    AppointmentsResultCounts,
    CategoryUsageItem,
    DailyConversationRow,
    OutcomeCountRow,
    QuestionUsageItem,
} from "../../types/report.types"
import { IReportRepository } from "../report.repository.interface"

export interface ReportStubOptions {
    outcomes?: OutcomeCountRow[]
    dailyConversations?: DailyConversationRow[]
    topCategories?: CategoryUsageItem[]
    topQuestions?: QuestionUsageItem[]
    appointmentsResult?: AppointmentsResultCounts
    abandonedByStep?: AbandonedStepCountRow[]
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
    setOptions(next: ReportStubOptions): void
} {
    let state: ReportStubOptions = { ...options }

    return {
        setOptions(next: ReportStubOptions): void {
            state = { ...next }
        },

        async getOutcomesCount(): Promise<OutcomeCountRow[]> {
            return [...(state.outcomes ?? [])]
        },

        async getDailyConversations(): Promise<DailyConversationRow[]> {
            return [...(state.dailyConversations ?? [])]
        },

        async getTopCategories(): Promise<CategoryUsageItem[]> {
            return [...(state.topCategories ?? [])]
        },

        async getTopQuestions(
            _start: Date,
            _endExclusive: Date,
            limit = 10,
        ): Promise<QuestionUsageItem[]> {
            return (state.topQuestions ?? []).slice(0, limit)
        },

        async getAppointmentsResultCounts(): Promise<AppointmentsResultCounts> {
            return {
                ...DEFAULT_APPOINTMENTS_RESULT,
                ...(state.appointmentsResult ?? {}),
            }
        },

        async getAbandonedByStep(): Promise<AbandonedStepCountRow[]> {
            return [...(state.abandonedByStep ?? [])]
        },
    }
}
