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
    lastCall?: { start: Date; endExclusive: Date; now?: Date }
} {
    const stub: IReportRepository & {
        lastCall?: { start: Date; endExclusive: Date; now?: Date }
    } = {
        async getOutcomesCount(start: Date, endExclusive: Date) {
            stub.lastCall = { start, endExclusive }
            return options.outcomes ?? []
        },
        async getAppointmentsCreatedCount() {
            return options.appointmentsCreated ?? 0
        },
        async getTopCategories() {
            return options.topCategories ?? []
        },
        async getTopQuestions() {
            return options.topQuestions ?? []
        },
        async getAppointmentsResultCounts(
            start: Date,
            endExclusive: Date,
            now?: Date,
        ) {
            stub.lastCall = { start, endExclusive, now }
            return options.appointmentsResult ?? DEFAULT_APPOINTMENTS_RESULT
        },
    }
    return stub
}
