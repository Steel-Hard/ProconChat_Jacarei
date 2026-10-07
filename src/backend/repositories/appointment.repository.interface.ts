import {
  AppointmentChipCounts,
  AppointmentDetail,
  AppointmentListFilters,
  AppointmentListItem,
} from "../types/appointment.types"

export interface IAppointmentRepository {
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
    id: number,
    actorUserId: number,
    now?: Date,
  ): Promise<AppointmentDetail>

  markAttended(
    id: number,
    actorUserId: number,
    autoClaim: boolean,
    now?: Date,
  ): Promise<AppointmentDetail>

  markNoShow(
    id: number,
    actorUserId: number,
    autoClaim: boolean,
    now?: Date,
  ): Promise<AppointmentDetail>

  getCurrentDocumentsConfig(
    byRepresentative: boolean,
    questionId: number,
  ): Promise<{ group: string[]; question: string[] }>
}
