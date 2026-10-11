interface AttemptState {
    failures: number
    windowStartedAt: number
    blockedUntil: number
}

const MAX_FAILURES = 5
const WINDOW_MS = 15 * 60 * 1000
const attempts = new Map<string, AttemptState>()

export const loginAttemptLimiter = {
    isBlocked(key: string, now = Date.now()): boolean {
        const state = attempts.get(key)
        if (!state) return false
        if (state.blockedUntil > now) return true
        if (now - state.windowStartedAt >= WINDOW_MS) attempts.delete(key)
        return false
    },

    recordFailure(key: string, now = Date.now()): void {
        let state = attempts.get(key)
        if (!state || now - state.windowStartedAt >= WINDOW_MS) {
            state = { failures: 0, windowStartedAt: now, blockedUntil: 0 }
        }
        state.failures += 1
        if (state.failures >= MAX_FAILURES) state.blockedUntil = now + WINDOW_MS
        attempts.set(key, state)

        if (attempts.size > 10_000) {
            for (const [attemptKey, attempt] of attempts) {
                if (attempt.blockedUntil <= now && now - attempt.windowStartedAt >= WINDOW_MS) {
                    attempts.delete(attemptKey)
                }
            }
        }
    },

    reset(key: string): void {
        attempts.delete(key)
    },
}
