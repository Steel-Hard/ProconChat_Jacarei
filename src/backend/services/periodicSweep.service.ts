export interface SweepLogger {
    error(message: string, ...details: unknown[]): void
}

export interface PeriodicSweepOptions {
    sweep: () => Promise<number>
    intervalMs: number
    logger: SweepLogger
    failureMessage: string
}

export function startPeriodicSweep({ sweep, intervalMs, logger, failureMessage }: PeriodicSweepOptions): () => void {
    let running = false

    const timer = setInterval(() => {
        if (running) {
            return
        }
        running = true
        sweep()
            .catch((error: unknown) => {
                logger.error(failureMessage, {
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
