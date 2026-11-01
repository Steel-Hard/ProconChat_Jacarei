import { GatewayClient } from "../clients/gateway.client"
import ConflictError from "../errors/ConflictError"
import NotFoundError from "../errors/NotFoundError"
import { AppointmentRepository } from "../repositories/appointment.repository.interface"
import type { CitizenNotificationOutcome } from "../types/appointment.types"
import { MODELO_AVISO_CANCELAMENTO, parametrosAvisoCancelamento } from "./messageFormatter.service"

export interface CitizenNotificationService {
    notifyCancellation(id: string, actorUserId: number, now?: Date): Promise<CitizenNotificationOutcome>
}

export interface CitizenNotificationDependencies {
    appointments: Pick<AppointmentRepository, "findCancellationNoticeTarget" | "recordCitizenNotification">
    gateway: Pick<GatewayClient, "sendTemplate">
    decrypt: (value: string) => string
    logger?: Pick<Console, "log">
}

export function createCitizenNotificationService({
    appointments,
    gateway,
    decrypt,
    logger = console,
}: CitizenNotificationDependencies): CitizenNotificationService {
    const inFlight = new Set<string>()

    function phoneOf(phoneEncrypted: string | null): string | null {
        if (phoneEncrypted === null) {
            return null
        }
        try {
            return decrypt(phoneEncrypted)
        } catch {
            return null
        }
    }

    function logFailure(appointmentId: string, reason: string): void {
        logger.log(JSON.stringify({ event: "citizen_notification_failed", appointmentId, reason }))
    }

    async function sendCancellationNotice(id: string, actorUserId: number, now: Date): Promise<CitizenNotificationOutcome> {
        const target = await appointments.findCancellationNoticeTarget(id)
        if (!target) {
            throw new NotFoundError("Agendamento não encontrado")
        }
        const reason = target.lastStaffCancelReason
        if (reason === null || target.lastCancellationNotice === "NOTIFIED") {
            throw new ConflictError("Não há aviso de cancelamento com falha para reenviar", "NOTIFICATION_NOT_RETRYABLE")
        }
        let outcome: CitizenNotificationOutcome = "FAILED"
        const to = phoneOf(target.phoneEncrypted)
        if (to === null) {
            logFailure(id, "PHONE_UNAVAILABLE")
        } else {
            const result = await gateway.sendTemplate({
                to,
                name: MODELO_AVISO_CANCELAMENTO.name,
                languageCode: MODELO_AVISO_CANCELAMENTO.languageCode,
                bodyParameters: parametrosAvisoCancelamento({
                    name: target.name,
                    protocol: target.protocol,
                    appointmentDatetime: target.appointmentDatetime,
                    reason,
                }),
            })
            if (result.ok) {
                outcome = "NOTIFIED"
            } else {
                logFailure(id, result.reason)
            }
        }
        await appointments.recordCitizenNotification(id, outcome, "CANCELLATION", actorUserId, now)
        return outcome
    }

    return {
        async notifyCancellation(id: string, actorUserId: number, now: Date = new Date()) {
            if (inFlight.has(id)) {
                throw new ConflictError(
                    "Já há um envio do aviso em andamento para este agendamento",
                    "NOTIFICATION_IN_PROGRESS",
                )
            }
            inFlight.add(id)
            try {
                return await sendCancellationNotice(id, actorUserId, now)
            } finally {
                inFlight.delete(id)
            }
        },
    }
}
