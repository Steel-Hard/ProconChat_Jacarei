import { GatewayClient, gatewayClient } from "../clients/gateway.client"
import {
    AppointmentReminderRepository,
    AppointmentReminderTarget,
    appointmentReminderRepository,
} from "../repositories/appointmentReminder.repository"
import { decrypt as defaultDecrypt } from "../utils/crypto.utils"
import { MODELO_LEMBRETE_ATENDIMENTO, parametrosLembreteAtendimento } from "./messageFormatter.service"

const TRANSIENT_REASONS = new Set(["UNREACHABLE", "NOT_CONFIGURED"])

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

    function logError(appointmentId: string, event: string, error: unknown): void {
        logger.log(
            JSON.stringify({
                event,
                appointmentId,
                reason: error instanceof Error ? error.message : "UNKNOWN",
            }),
        )
    }

    async function sendOne(target: AppointmentReminderTarget, now: Date): Promise<boolean> {
        if (!(await repository.isStillDue(target.id, target.appointmentDatetime, now))) {
            return false
        }
        const to = phoneOf(target.phoneEncrypted)
        if (to === null) {
            logFailure(target.id, "PHONE_UNAVAILABLE")
            await repository.recordReminderOutcome(target.id, "FAILED", now, target.appointmentDatetime)
            return false
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
            try {
                await repository.recordReminderOutcome(
                    target.id,
                    "SENT",
                    now,
                    target.appointmentDatetime,
                    result.providerMessageId,
                )
            } catch (error) {
                logError(target.id, "appointment_reminder_record_failed", error)
                return true
            }
            return true
        }
        logFailure(target.id, result.reason)
        if (TRANSIENT_REASONS.has(result.reason)) {
            return false
        }
        await repository.recordReminderOutcome(
            target.id,
            "FAILED",
            now,
            target.appointmentDatetime,
            null,
            result.errorCode ?? null,
        )
        return false
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
                if (await sendOne(target, now)) {
                    sentCount += 1
                }
            } catch (error) {
                logError(target.id, "appointment_reminder_error", error)
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
