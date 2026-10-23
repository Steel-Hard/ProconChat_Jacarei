import {
    BlockedDate,
    BookAppointmentInput,
    BookAppointmentResult,
    NormalizedScheduleConfig,
    ScheduleConfigView,
    ScheduleRange,
    ScheduleSettings,
} from "../types/schedule.types"

export interface SaveScheduleConfigRepoParams {
    config: NormalizedScheduleConfig
    actorUserId: number
    now: Date
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
    saveConfig(params: SaveScheduleConfigRepoParams): Promise<ScheduleConfigView>
}
