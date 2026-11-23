import { privacySettingsRepository } from "../repositories/privacySettings.repository"
import { PrivacySettingsRepository } from "../repositories/privacySettings.repository.interface"
import { RetentionRepository, retentionRepository } from "../repositories/retention.repository"

export const RETENTION_SWEEP_INTERVAL_MS = 3_600_000
export const RETENTION_SWEEP_LIMIT = 500

interface RetentionSweepLogger {
    info(message: string, ...details: unknown[]): void
}

interface RetentionSweepDependencies {
    settings: Pick<PrivacySettingsRepository, "find">
    repository: Pick<RetentionRepository, "anonymizeDue">
    logger: RetentionSweepLogger
    clock?: () => Date
    limit?: number
}

export function createRetentionSweep({
    settings,
    repository,
    logger,
    clock = () => new Date(),
    limit = RETENTION_SWEEP_LIMIT,
}: RetentionSweepDependencies): () => Promise<number> {
    return async () => {
        const row = await settings.find()
        if (!row?.retentionEnabled) {
            return 0
        }
        const counts = await repository.anonymizeDue({
            now: clock(),
            sessionDays: row.sessionRetentionDays,
            appointmentDays: row.appointmentRetentionDays,
            limit,
        })
        if (counts.sessions > 0 || counts.appointments > 0) {
            logger.info("Retention sweep anonymized records", {
                sessions: counts.sessions,
                appointments: counts.appointments,
            })
        }
        return counts.sessions + counts.appointments
    }
}

export const sweepRetention = createRetentionSweep({
    settings: privacySettingsRepository,
    repository: retentionRepository,
    logger: console,
})
