interface SweepLogger {
    error(message: string, ...details: unknown[]): void
}

interface AbandonedSessionsSweepOptions {
    sweep: () => Promise<number>
    intervalMs: number
    logger: SweepLogger
}

export const DEFAULT_SWEEP_INTERVAL_MS = 60_000

export function startAbandonedSessionsSweep({
    sweep,
    intervalMs,
    logger,
}: AbandonedSessionsSweepOptions): () => void {
    let running = false

    const timer = setInterval(() => {
        if (running) {
            return
        }
        running = true
        sweep()
            .catch((error: unknown) => {
                logger.error("Failed to sweep abandoned sessions", {
                    code: error instanceof Error ? error.name : "UNKNOWN",
                })
            })
            .finally(() => {
                running = false
            })
    }, intervalMs)

    timer.unref()

    return () => clearInterval(timer)
}
