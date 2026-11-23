import {
    BlockedDate,
    BookAppointmentInput,
    BookAppointmentResult,
    CitizenCancelInput,
    CitizenCancelResult,
    CitizenRescheduleInput,
    CitizenRescheduleResult,
    FutureActiveAppointment,
    NormalizedScheduleConfig,
    ReturningAppointment,
    ScheduleConfigView,
    ScheduleConflictResolution,
    ScheduleRange,
    ScheduleSettings,
    ScheduleVersion,
} from "../types/schedule.types"

export interface ScheduleResolutionOutcome {
    affectedIds: string[]
    noticeEnabled: boolean
}

export interface SaveScheduleConfigRepoParams {
    config: NormalizedScheduleConfig
    actorUserId: number
    now: Date
    validateAgainstVersions?: (versions: ScheduleVersion[]) => void
    conflictResolution?: ScheduleConflictResolution
    seenConflictIds?: string[]
    seenNoticeEnabled?: boolean
    onResolved?: (outcome: ScheduleResolutionOutcome) => void
}

export interface DeleteScheduledConfigRepoOptions {
    actorUserId?: number
    conflictResolution?: ScheduleConflictResolution
    seenConflictIds?: string[]
    seenNoticeEnabled?: boolean
    onResolved?: (outcome: ScheduleResolutionOutcome) => void
}

export interface IScheduleRepository {
    getSettings(): Promise<ScheduleSettings | null>
    getRanges(): Promise<ScheduleRange[]>
    getBlockedDates(fromDate: string, toDate: string): Promise<BlockedDate[]>
    countActiveAppointmentsPerSlot(
        fromDatetime: Date,
        toDatetime: Date,
    ): Promise<Map<string, number>>
    bookAppointment(input: BookAppointmentInput): Promise<BookAppointmentResult>
    getConfig(): Promise<ScheduleConfigView | null>
    getConfigForDate(date: string): Promise<ScheduleVersion | null>
    getScheduleVersions(fromDate: string, toDate: string): Promise<ScheduleVersion[]>
    listScheduledConfigs(fromDate: string): Promise<ScheduleVersion[]>
    saveConfig(params: SaveScheduleConfigRepoParams): Promise<ScheduleConfigView>
    saveScheduledConfig(
        params: SaveScheduleConfigRepoParams & { effectiveFrom: string },
    ): Promise<ScheduleConfigView>
    deleteScheduledConfig(
        effectiveFrom: string,
        now: Date,
        options?: DeleteScheduledConfigRepoOptions,
    ): Promise<void>
    listFutureActiveAppointments(now: Date): Promise<FutureActiveAppointment[]>
    findReturningAppointment(phoneHash: string, now?: Date): Promise<ReturningAppointment | null>
    cancelByCitizen(input: CitizenCancelInput): Promise<CitizenCancelResult>
    rescheduleByCitizen(input: CitizenRescheduleInput): Promise<CitizenRescheduleResult>
}
