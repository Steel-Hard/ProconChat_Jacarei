import BadRequestError from "../errors/BadRequestError"
import NotFoundError from "../errors/NotFoundError"
import { IAppointmentRepository } from "../repositories/appointment.repository.interface"
import {
  AppointmentDetail,
  AppointmentListFilters,
  AppointmentListResponse,
} from "../types/appointment.types"
import {
  isDateOnOrBeforeToday,
  isDatetimePast,
} from "../utils/date.utils"

export class AppointmentService {
  constructor(private readonly repository: IAppointmentRepository) {}

  async listAppointments(
    filters: AppointmentListFilters,
    now: Date = new Date(),
  ): Promise<AppointmentListResponse> {
    const page = filters.page && filters.page > 0 ? filters.page : 1
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 20

    const { items, total, chipCounts } = await this.repository.findList(
      { ...filters, page, limit },
      now,
    )

    const totalPages = Math.ceil(total / limit) || 1

    return {
      data: items,
      total,
      page,
      limit,
      totalPages,
      chipCounts,
    }
  }

  async getPendingCount(): Promise<{ count: number }> {
    const count = await this.repository.countPending()
    return { count }
  }

  async getAppointmentDetail(
    idOrCode: number | string,
  ): Promise<AppointmentDetail> {
    const appointment = await this.repository.findById(idOrCode)
    if (!appointment) {
      throw new NotFoundError("Agendamento não encontrado")
    }
    return appointment
  }

  async claimAppointment(
    idOrCode: number | string,
    actorUserId: number,
    now: Date = new Date(),
  ): Promise<AppointmentDetail> {
    const appointment = await this.getAppointmentDetail(idOrCode)

    if (appointment.status !== "PENDING") {
      throw new BadRequestError(
        "Apenas agendamentos com status Pendente podem ser assumidos",
      )
    }

    return this.repository.claim(Number(appointment.id), actorUserId, now)
  }

  async markAttended(
    idOrCode: number | string,
    actorUserId: number,
    now: Date = new Date(),
  ): Promise<AppointmentDetail> {
    const appointment = await this.getAppointmentDetail(idOrCode)

    if (appointment.status === "ATTENDED") {
      throw new BadRequestError("Agendamento já foi marcado como atendido")
    }
    if (appointment.status === "NO_SHOW") {
      throw new BadRequestError(
        "Agendamento já foi registrado como não compareceu",
      )
    }
    if (appointment.status === "CANCELED") {
      throw new BadRequestError(
        "Não é possível registrar atendimento para um agendamento cancelado",
      )
    }
    if (appointment.status !== "PENDING" && appointment.status !== "CONFIRMED") {
      throw new BadRequestError(
        `Ação não permitida para agendamentos com status ${appointment.status}`,
      )
    }

    // Regra: Disponível a partir do dia do atendimento
    const apptDate = new Date(appointment.appointment_datetime)
    if (!isDateOnOrBeforeToday(apptDate, now)) {
      throw new BadRequestError(
        "Disponível a partir do dia do atendimento",
      )
    }

    const autoClaim = appointment.status === "PENDING"
    return this.repository.markAttended(
      Number(appointment.id),
      actorUserId,
      autoClaim,
      now,
    )
  }

  async markNoShow(
    idOrCode: number | string,
    actorUserId: number,
    now: Date = new Date(),
  ): Promise<AppointmentDetail> {
    const appointment = await this.getAppointmentDetail(idOrCode)

    if (appointment.status === "ATTENDED") {
      throw new BadRequestError(
        "Agendamento já foi marcado como atendido",
      )
    }
    if (appointment.status === "NO_SHOW") {
      throw new BadRequestError(
        "Agendamento já foi registrado como não compareceu",
      )
    }
    if (appointment.status === "CANCELED") {
      throw new BadRequestError(
        "Não é possível registrar como não compareceu para um agendamento cancelado",
      )
    }
    if (appointment.status !== "PENDING" && appointment.status !== "CONFIRMED") {
      throw new BadRequestError(
        `Ação não permitida para agendamentos com status ${appointment.status}`,
      )
    }

    // Regra: Disponível apenas depois do horário do agendamento
    const apptDatetime = new Date(appointment.appointment_datetime)
    if (!isDatetimePast(apptDatetime, now)) {
      throw new BadRequestError(
        "Disponível apenas após o horário do agendamento",
      )
    }

    const autoClaim = appointment.status === "PENDING"
    return this.repository.markNoShow(
      Number(appointment.id),
      actorUserId,
      autoClaim,
      now,
    )
  }
}
