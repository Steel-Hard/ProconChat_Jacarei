import {
    AppointmentChipCounts,
    AppointmentDetailRecord,
    AppointmentListFilters,
    AppointmentListItem,
    CalendarFilters,
    CancellationNoticeTarget,
    CancellationReason,
    CitizenNotificationKind,
    CitizenNotificationOutcome,
    CorrectionResult,
    StaffMember,
    WeekAppointmentRecord,
} from "../types/appointment.types"

export interface AppointmentRepository {
    findList(
        filters: AppointmentListFilters,
        now?: Date,
    ): Promise<{
        items: AppointmentListItem[]
        total: number
        chipCounts: AppointmentChipCounts
    }>

    countPending(): Promise<number>

    findWeek(from: Date, to: Date, filters: CalendarFilters, now?: Date): Promise<WeekAppointmentRecord[]>

    findStaff(): Promise<StaffMember[]>

    findById(id: number | string): Promise<AppointmentDetailRecord | null>

    claim(
        id: string,
        actorUserId: number,
        now?: Date,
    ): Promise<void>

    assign(
        id: string,
        assigneeUserId: number,
        actorUserId: number,
        now?: Date,
    ): Promise<void>

    correctRecord(
        id: string,
        actorUserId: number,
        now?: Date,
    ): Promise<CorrectionResult>

    addNote(
        id: string,
        authorUserId: number,
        text: string,
        now?: Date,
    ): Promise<void>

    markAttended(
        id: string,
        actorUserId: number,
        now?: Date,
    ): Promise<void>

    markNoShow(
        id: string,
        actorUserId: number,
        now?: Date,
    ): Promise<void>

    cancel(
        id: string,
        actorUserId: number,
        reason: CancellationReason,
        note: string | undefined,
        now?: Date,
    ): Promise<void>

    findCancellationNoticeTarget(id: string): Promise<CancellationNoticeTarget | null>

    recordCitizenNotification(
        id: string,
        outcome: CitizenNotificationOutcome,
        kind: CitizenNotificationKind,
        actorUserId: number,
        now?: Date,
        providerMessageId?: string | null,
    ): Promise<void>

    countNotifiedPhonesBetween(from: Date, to: Date): Promise<number>

    getCurrentDocumentsConfig(
        byRepresentative: boolean,
        questionId: number,
    ): Promise<{ group: string[]; question: string[] }>

    resolveTitles(
        categoryIds: number[],
        questionIds: number[],
    ): Promise<{
        categories: Record<number, string>
        questions: Record<number, string>
    }>
}

export type IAppointmentRepository = AppointmentRepository

