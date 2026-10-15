import {
    BlockedDate,
    BookAppointmentInput,
    BookAppointmentResult,
    ScheduleRange,
    ScheduleSettings,
} from "../types/schedule.types"

export interface IScheduleRepository {
    getSettings(): Promise<ScheduleSettings | null>
    getRanges(): Promise<ScheduleRange[]>
    getBlockedDates(fromDate: string, toDate: string): Promise<BlockedDate[]>
    countActiveAppointmentsPerSlot(
        fromDatetime: Date,
        toDatetime: Date,
    ): Promise<Map<string, number>>
    bookAppointment(input: BookAppointmentInput): Promise<BookAppointmentResult>
}
