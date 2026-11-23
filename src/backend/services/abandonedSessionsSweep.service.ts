import { startPeriodicSweep, SweepLogger } from "./periodicSweep.service"

interface AbandonedSessionsSweepOptions {
    sweep: () => Promise<number>
    intervalMs: number
    logger: SweepLogger
}

export const DEFAULT_SWEEP_INTERVAL_MS = 60_000

export function startAbandonedSessionsSweep({ sweep, intervalMs, logger }: AbandonedSessionsSweepOptions): () => void {
    return startPeriodicSweep({ sweep, intervalMs, logger, failureMessage: "Failed to sweep abandoned sessions" })
}
