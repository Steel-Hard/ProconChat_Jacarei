import AppError from "../errors/AppError"
import ConflictError from "../errors/ConflictError"
import type {
    AppointmentActionAvailability,
    AppointmentActionType,
    AppointmentAvailableActions,
    AppointmentStatus,
    CorrectionHistoryEvent,
    CorrectionTarget,
    TransitionErrorCode,
} from "../types/appointment.types"
import { isDateOnOrBeforeToday, isDatetimePast } from "../utils/date.utils"

export interface TransitionTarget {
    status: AppointmentStatus
    appointmentDatetime: Date
}

export interface ActionAccess {
    canManage: boolean
}

export interface CancellationNoticeState {
    status: AppointmentStatus
    hasStaffCancellation: boolean
    lastCancellationNotice: "NOTIFIED" | "FAILED" | null
    hasPhone: boolean
    appointmentDatetime: Date
}

export type CancellationNoticeFacts = Omit<CancellationNoticeState, "status" | "appointmentDatetime">

const NO_CANCELLATION_NOTICE: CancellationNoticeFacts = {
    hasStaffCancellation: false,
    lastCancellationNotice: null,
    hasPhone: false,
}

export type TransitionDecision =
    | { allowed: true }
    | { allowed: false; error: AppError; code: TransitionErrorCode }

const ALLOWED: TransitionDecision = { allowed: true }

function refuse(message: string, code: TransitionErrorCode): TransitionDecision {
    return { allowed: false, error: new ConflictError(message, code), code }
}

function decideClaim(status: AppointmentStatus): TransitionDecision {
    if (status === "CANCELED") {
        return refuse("Não é possível assumir um agendamento cancelado", "APPOINTMENT_CANCELED")
    }
    if (status === "ATTENDED") {
        return refuse("Agendamento já foi atendido", "ALREADY_ATTENDED")
    }
    if (status === "NO_SHOW") {
        return refuse("Agendamento já registrado como não compareceu", "ALREADY_NO_SHOW")
    }
    if (status !== "PENDING") {
        return refuse("Apenas agendamentos pendentes podem ser assumidos", "APPOINTMENT_ALREADY_CLAIMED")
    }
    return ALLOWED
}

function decideAssign(status: AppointmentStatus): TransitionDecision {
    if (status === "CANCELED") {
        return refuse("Não é possível atribuir um agendamento cancelado", "APPOINTMENT_CANCELED")
    }
    if (status === "ATTENDED") {
        return refuse("Agendamento já foi atendido", "ALREADY_ATTENDED")
    }
    if (status === "NO_SHOW") {
        return refuse("Agendamento já registrado como não compareceu", "ALREADY_NO_SHOW")
    }
    return ALLOWED
}

function decideCorrectRecord(status: AppointmentStatus): TransitionDecision {
    if (status === "ATTENDED" || status === "NO_SHOW") {
        return ALLOWED
    }
    return refuse("Só é possível corrigir um agendamento atendido ou não compareceu", "RECORD_NOT_CORRECTABLE")
}

function decideRecordStatus(status: AppointmentStatus, canceledMessage: string): TransitionDecision | null {
    if (status === "ATTENDED") {
        return refuse("Agendamento já foi marcado como atendido", "ALREADY_ATTENDED")
    }
    if (status === "NO_SHOW") {
        return refuse("Agendamento já foi registrado como não compareceu", "ALREADY_NO_SHOW")
    }
    if (status === "CANCELED") {
        return refuse(canceledMessage, "APPOINTMENT_CANCELED")
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
        return refuse("Disponível a partir do dia do atendimento", "ATTENDANCE_NOT_YET_AVAILABLE")
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
        return refuse("Disponível apenas após o horário do agendamento", "NO_SHOW_NOT_YET_AVAILABLE")
    }
    return ALLOWED
}

function decideCancel(target: TransitionTarget, now: Date): TransitionDecision {
    const statusDecision = decideRecordStatus(target.status, "Agendamento já está cancelado")
    if (statusDecision) {
        return statusDecision
    }
    if (isDatetimePast(target.appointmentDatetime, now)) {
        return refuse("Só é possível cancelar antes do horário do atendimento", "CANCEL_AFTER_START")
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
    if (action === "assign") {
        return decideAssign(target.status)
    }
    if (action === "correct_record") {
        return decideCorrectRecord(target.status)
    }
    if (action === "cancel") {
        return decideCancel(target, now)
    }
    return decideNoShow(target, now)
}

export function decideRetryCancellationNotice(state: CancellationNoticeState, now: Date): TransitionDecision {
    if (state.status !== "CANCELED" || !state.hasStaffCancellation || state.lastCancellationNotice !== "FAILED") {
        return refuse("Não há aviso de cancelamento com falha para reenviar", "NOTIFICATION_NOT_RETRYABLE")
    }
    if (!state.hasPhone) {
        return refuse("O agendamento não tem telefone para enviar o aviso", "CITIZEN_PHONE_UNAVAILABLE")
    }
    if (isDatetimePast(state.appointmentDatetime, now)) {
        return refuse("O horário do atendimento já passou e o aviso não serve mais", "NOTIFICATION_AFTER_START")
    }
    return ALLOWED
}

function availabilityOf(decision: TransitionDecision): AppointmentActionAvailability {
    return decision.allowed
        ? { allowed: true, code: null }
        : { allowed: false, code: decision.code }
}

const PERMISSION_REQUIRED: AppointmentActionAvailability = { allowed: false, code: "PERMISSION_REQUIRED" }

export function availableActions(
    target: TransitionTarget,
    now: Date,
    access: ActionAccess,
    notice: CancellationNoticeFacts = NO_CANCELLATION_NOTICE,
): AppointmentAvailableActions {
    if (!access.canManage) {
        return {
            claim: PERMISSION_REQUIRED,
            attended: PERMISSION_REQUIRED,
            no_show: PERMISSION_REQUIRED,
            assign: PERMISSION_REQUIRED,
            correct_record: PERMISSION_REQUIRED,
            add_note: PERMISSION_REQUIRED,
            cancel: PERMISSION_REQUIRED,
            retry_cancellation_notice: PERMISSION_REQUIRED,
        }
    }
    return {
        claim: availabilityOf(decideTransition("claim", target, now)),
        attended: availabilityOf(decideTransition("attended", target, now)),
        no_show: availabilityOf(decideTransition("no_show", target, now)),
        assign: availabilityOf(decideTransition("assign", target, now)),
        correct_record: availabilityOf(decideTransition("correct_record", target, now)),
        add_note: { allowed: true, code: null },
        cancel: availabilityOf(decideTransition("cancel", target, now)),
        retry_cancellation_notice: availabilityOf(decideRetryCancellationNotice({ ...target, ...notice }, now)),
    }
}

const TERMINAL_EVENTS = new Set(["ATTENDED", "NO_SHOW"])

function isLater(a: CorrectionHistoryEvent, b: CorrectionHistoryEvent): boolean {
    const diff = a.createdAt.getTime() - b.createdAt.getTime()
    return diff > 0 || (diff === 0 && Number(a.id) > Number(b.id))
}

export function restoredStateAfterCorrection(
    events: CorrectionHistoryEvent[],
    current: { assignedUserId: number | null },
): CorrectionTarget {
    const terminal = events
        .filter((event) => TERMINAL_EVENTS.has(event.type))
        .reduce<CorrectionHistoryEvent | null>((latest, event) => (!latest || isLater(event, latest) ? event : latest), null)
    const autoClaimed =
        terminal !== null &&
        events.some(
            (event) =>
                event.type === "CLAIMED" &&
                event.data.auto_claimed === true &&
                event.createdAt.getTime() === terminal.createdAt.getTime(),
        )
    if (autoClaimed || current.assignedUserId === null) {
        return { status: "PENDING", assignedUserId: null }
    }
    return { status: "CONFIRMED", assignedUserId: current.assignedUserId }
}
