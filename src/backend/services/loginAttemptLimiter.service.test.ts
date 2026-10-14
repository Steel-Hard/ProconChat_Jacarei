import { describe, expect, it } from "vitest"
import { createLoginAttemptLimiter } from "./loginAttemptLimiter.service"

const WINDOW_MS = 15 * 60 * 1000

function setup() {
    let current = 1_000_000
    const limiter = createLoginAttemptLimiter({
        maxFailuresPerPair: 5,
        maxFailuresPerIp: 20,
        windowMs: WINDOW_MS,
        now: () => current,
    })
    const advance = (ms: number) => {
        current += ms
    }
    return { limiter, advance }
}

const attempt = { ip: "198.51.100.7", email: "pessoa@exemplo.test" }

describe("createLoginAttemptLimiter", () => {
    it("bloqueia o par IP e e-mail na 5a falha", () => {
        const { limiter } = setup()
        for (let i = 0; i < 4; i++) limiter.recordFailure(attempt)

        expect(limiter.check(attempt).blocked).toBe(false)
        limiter.recordFailure(attempt)
        expect(limiter.check(attempt).blocked).toBe(true)
    })

    it("atende outro IP com o mesmo e-mail enquanto o par esta bloqueado", () => {
        const { limiter } = setup()
        for (let i = 0; i < 5; i++) limiter.recordFailure(attempt)

        const result = limiter.check({ ip: "203.0.113.9", email: attempt.email })

        expect(result).toEqual({ blocked: false, retryAfterSeconds: 0 })
    })

    it("bloqueia o IP que soma 20 falhas em qualquer e-mail", () => {
        const { limiter } = setup()
        for (let i = 0; i < 20; i++) limiter.recordFailure({ ip: attempt.ip, email: `conta${i % 10}@exemplo.test` })

        const result = limiter.check({ ip: attempt.ip, email: "nunca-tentado@exemplo.test" })

        expect(result.blocked).toBe(true)
    })

    it("nao bloqueia o IP com 19 falhas espalhadas em e-mails diferentes", () => {
        const { limiter } = setup()
        for (let i = 0; i < 19; i++) limiter.recordFailure({ ip: attempt.ip, email: `conta${i}@exemplo.test` })

        expect(limiter.check({ ip: attempt.ip, email: "nunca-tentado@exemplo.test" }).blocked).toBe(false)
    })

    it("libera o par depois dos 15 minutos de bloqueio", () => {
        const { limiter, advance } = setup()
        for (let i = 0; i < 5; i++) limiter.recordFailure(attempt)

        advance(WINDOW_MS - 1)
        expect(limiter.check(attempt).blocked).toBe(true)
        advance(1)
        expect(limiter.check(attempt)).toEqual({ blocked: false, retryAfterSeconds: 0 })
    })

    it("informa em retryAfterSeconds o tempo que falta para o fim do bloqueio", () => {
        const { limiter, advance } = setup()
        for (let i = 0; i < 5; i++) limiter.recordFailure(attempt)

        advance(60_500)

        expect(limiter.check(attempt)).toEqual({ blocked: true, retryAfterSeconds: 840 })
    })

    it("zera so o contador do par no reset, mantendo o do IP", () => {
        const { limiter } = setup()
        for (let i = 0; i < 16; i++) limiter.recordFailure({ ip: attempt.ip, email: `outra${i}@exemplo.test` })
        for (let i = 0; i < 4; i++) limiter.recordFailure(attempt)

        limiter.reset(attempt)
        limiter.recordFailure(attempt)

        expect(limiter.check(attempt).blocked).toBe(true)
        expect(limiter.check({ ip: "203.0.113.9", email: attempt.email }).blocked).toBe(false)
    })

    it("recomeca a contagem quando a falha acontece depois da janela", () => {
        const { limiter, advance } = setup()
        for (let i = 0; i < 4; i++) limiter.recordFailure(attempt)

        advance(WINDOW_MS)
        limiter.recordFailure(attempt)

        expect(limiter.check(attempt).blocked).toBe(false)
    })

    it("descarta as chaves vencidas quando passa de 10 000 chaves", () => {
        const { limiter, advance } = setup()
        for (let i = 0; i < 6000; i++) limiter.recordFailure({ ip: `10.0.${Math.floor(i / 250)}.${i % 250}`, email: "a@exemplo.test" })
        expect(limiter.trackedKeys()).toBe(12000)

        advance(WINDOW_MS)
        limiter.recordFailure(attempt)

        expect(limiter.trackedKeys()).toBe(2)
    })
})
