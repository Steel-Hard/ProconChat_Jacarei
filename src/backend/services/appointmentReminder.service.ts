import { GatewayClient, gatewayClient } from "../clients/gateway.client"
import {
    AppointmentReminderRepository,
    appointmentReminderRepository,
} from "../repositories/appointmentReminder.repository"
import { decrypt as defaultDecrypt } from "../utils/crypto.utils"
import { MODELO_LEMBRETE_ATENDIMENTO, parametrosLembreteAtendimento } from "./messageFormatter.service"

export interface AppointmentReminderDependencies {
    repository: AppointmentReminderRepository
    gateway: Pick<GatewayClient, "sendTemplate">
    decrypt?: (value: string) => string
    clock?: () => Date
    logger?: Pick<Console, "log">
}

export function createSweepAppointmentReminders({
    repository,
    gateway,
    decrypt = defaultDecrypt,
    clock = () => new Date(),
    logger = console,
}: AppointmentReminderDependencies): () => Promise<number> {
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
        logger.log(JSON.stringify({ event: "appointment_reminder_failed", appointmentId, reason }))
    }

    return async () => {
        const now = clock()
        const targets = await repository.findDueTargets(now)
        let sentCount = 0
        for (const target of targets) {
            if (inFlight.has(target.id)) {
                continue
            }
            inFlight.add(target.id)
            try {
                const to = phoneOf(target.phoneEncrypted)
                if (to === null) {
                    logFailure(target.id, "PHONE_UNAVAILABLE")
                    await repository.recordReminderOutcome(target.id, "FAILED", now, null)
                    continue
                }
                const result = await gateway.sendTemplate({
                    to,
                    name: MODELO_LEMBRETE_ATENDIMENTO.name,
                    languageCode: MODELO_LEMBRETE_ATENDIMENTO.languageCode,
                    bodyParameters: parametrosLembreteAtendimento({
                        name: target.name,
                        protocol: target.protocol,
                        appointmentDatetime: target.appointmentDatetime,
                        unitAddress: target.unitAddress,
                        unitAddressComplement: target.unitAddressComplement,
                        documentsSent: target.documentsSent,
                    }),
                })
                if (result.ok) {
                    const recorded = await repository.recordReminderOutcome(
                        target.id,
                        "SENT",
                        now,
                        result.providerMessageId,
                    )
                    if (recorded) {
                        sentCount += 1
                    }
                } else {
                    logFailure(target.id, result.reason)
                    await repository.recordReminderOutcome(target.id, "FAILED", now, null)
                }
            } finally {
                inFlight.delete(target.id)
            }
        }
        return sentCount
    }
}

export const sweepAppointmentReminders = createSweepAppointmentReminders({
    repository: appointmentReminderRepository,
    gateway: gatewayClient,
})
