import {
    BlockedDate,
    BookAppointmentInput,
    BookAppointmentResult,
    FutureActiveAppointment,
    NormalizedScheduleConfig,
    ScheduleConfigView,
    ScheduleRange,
    ScheduleSettings,
    ScheduleVersion,
} from "../types/schedule.types"

export interface SaveScheduleConfigRepoParams {
    config: NormalizedScheduleConfig
    actorUserId: number
    now: Date
    validateAgainstVersions?: (versions: ScheduleVersion[]) => void
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
    deleteScheduledConfig(effectiveFrom: string, now: Date): Promise<void>
    listFutureActiveAppointments(now: Date): Promise<FutureActiveAppointment[]>
}
