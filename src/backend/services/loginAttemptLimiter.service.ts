export interface LoginAttempt {
    ip: string
    email: string
}

export interface LoginAttemptCheck {
    blocked: boolean
    retryAfterSeconds: number
}

export interface LoginAttemptLimiter {
    check(attempt: LoginAttempt): LoginAttemptCheck
    recordFailure(attempt: LoginAttempt): void
    reset(attempt: LoginAttempt): void
    trackedKeys(): number
}

interface LoginAttemptLimiterOptions {
    maxFailuresPerPair: number
    maxFailuresPerIp: number
    windowMs: number
    now: () => number
}

interface AttemptState {
    failures: number
    windowStartedAt: number
    blockedUntil: number
}

const MAX_TRACKED_KEYS = 10_000

const pairKey = ({ ip, email }: LoginAttempt): string => `pair:${ip}\n${email}`
const ipKey = ({ ip }: LoginAttempt): string => `ip:${ip}`

export function createLoginAttemptLimiter({
    maxFailuresPerPair,
    maxFailuresPerIp,
    windowMs,
    now,
}: LoginAttemptLimiterOptions): LoginAttemptLimiter {
    const states = new Map<string, AttemptState>()

    const isExpired = (state: AttemptState, at: number): boolean =>
        state.blockedUntil <= at && at - state.windowStartedAt >= windowMs

    const blockedUntil = (key: string, at: number): number => {
        const state = states.get(key)
        return state && state.blockedUntil > at ? state.blockedUntil : 0
    }

    const increment = (key: string, limit: number, at: number): void => {
        const current = states.get(key)
        const state =
            current && at - current.windowStartedAt < windowMs
                ? current
                : { failures: 0, windowStartedAt: at, blockedUntil: current?.blockedUntil ?? 0 }
        state.failures += 1
        if (state.failures >= limit) {
            state.blockedUntil = at + windowMs
        }
        states.set(key, state)
    }

    const sweep = (at: number): void => {
        if (states.size <= MAX_TRACKED_KEYS) {
            return
        }
        for (const [key, state] of states) {
            if (isExpired(state, at)) {
                states.delete(key)
            }
        }
    }

    return {
        check(attempt) {
            const at = now()
            const until = Math.max(blockedUntil(pairKey(attempt), at), blockedUntil(ipKey(attempt), at))
            if (until === 0) {
                return { blocked: false, retryAfterSeconds: 0 }
            }
            return { blocked: true, retryAfterSeconds: Math.ceil((until - at) / 1000) }
        },

        recordFailure(attempt) {
            const at = now()
            increment(pairKey(attempt), maxFailuresPerPair, at)
            increment(ipKey(attempt), maxFailuresPerIp, at)
            sweep(at)
        },

        reset(attempt) {
            states.delete(pairKey(attempt))
        },

        trackedKeys() {
            return states.size
        },
    }
}

export const loginAttemptLimiter = createLoginAttemptLimiter({
    maxFailuresPerPair: 5,
    maxFailuresPerIp: 20,
    windowMs: 15 * 60 * 1000,
    now: Date.now,
})
