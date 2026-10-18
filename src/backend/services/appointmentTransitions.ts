import AppError from "../errors/AppError"
import BadRequestError from "../errors/BadRequestError"
import ConflictError from "../errors/ConflictError"
import type { AppointmentActionType, AppointmentStatus } from "../types/appointment.types"
import { isDateOnOrBeforeToday, isDatetimePast } from "../utils/date.utils"

export interface TransitionTarget {
    status: AppointmentStatus
    appointmentDatetime: Date
}

export type TransitionDecision = { allowed: true } | { allowed: false; error: AppError }

const ALLOWED: TransitionDecision = { allowed: true }

function refuse(error: AppError): TransitionDecision {
    return { allowed: false, error }
}

function decideClaim(status: AppointmentStatus): TransitionDecision {
    if (status === "CANCELED") {
        return refuse(
            new ConflictError(
                "Não é possível assumir um agendamento cancelado",
                "APPOINTMENT_CANCELED",
            ),
        )
    }
    if (status === "ATTENDED") {
        return refuse(new ConflictError("Agendamento já foi atendido", "ALREADY_ATTENDED"))
    }
    if (status === "NO_SHOW") {
        return refuse(
            new ConflictError(
                "Agendamento já registrado como não compareceu",
                "ALREADY_NO_SHOW",
            ),
        )
    }
    if (status !== "PENDING") {
        return refuse(
            new ConflictError(
                "Apenas agendamentos pendentes podem ser assumidos",
                "APPOINTMENT_ALREADY_CLAIMED",
            ),
        )
    }
    return ALLOWED
}

function decideRecordStatus(status: AppointmentStatus, canceledMessage: string): TransitionDecision | null {
    if (status === "ATTENDED") {
        return refuse(
            new ConflictError("Agendamento já foi marcado como atendido", "ALREADY_ATTENDED"),
        )
    }
    if (status === "NO_SHOW") {
        return refuse(
            new ConflictError(
                "Agendamento já foi registrado como não compareceu",
                "ALREADY_NO_SHOW",
            ),
        )
    }
    if (status === "CANCELED") {
        return refuse(new ConflictError(canceledMessage, "APPOINTMENT_CANCELED"))
    }
    return null
}

function decideAttended(target: TransitionTarget, now: Date): TransitionDecision {
    const statusDecision = decideRecordStatus(
        target.status,
        "Não é possível registrar atendimento para um agendamento cancelado",
    )
    if (statusDecision) {
        return statusDecision
    }
    if (!isDateOnOrBeforeToday(target.appointmentDatetime, now)) {
        return refuse(new BadRequestError("Disponível a partir do dia do atendimento"))
    }
    return ALLOWED
}

function decideNoShow(target: TransitionTarget, now: Date): TransitionDecision {
    const statusDecision = decideRecordStatus(
        target.status,
        "Não é possível registrar como não compareceu para um agendamento cancelado",
    )
    if (statusDecision) {
        return statusDecision
    }
    if (!isDatetimePast(target.appointmentDatetime, now)) {
        return refuse(new BadRequestError("Disponível apenas após o horário do agendamento"))
    }
    return ALLOWED
}

export function decideTransition(
    action: AppointmentActionType,
    target: TransitionTarget,
    now: Date,
): TransitionDecision {
    if (action === "claim") {
        return decideClaim(target.status)
    }
    if (action === "attended") {
        return decideAttended(target, now)
    }
    return decideNoShow(target, now)
}
