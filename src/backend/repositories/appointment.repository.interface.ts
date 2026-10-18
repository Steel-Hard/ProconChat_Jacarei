import {
    AppointmentChipCounts,
    AppointmentDetail,
    AppointmentListFilters,
    AppointmentListItem,
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

    findById(id: number | string): Promise<AppointmentDetail | null>

    claim(
        id: string,
        actorUserId: number,
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

