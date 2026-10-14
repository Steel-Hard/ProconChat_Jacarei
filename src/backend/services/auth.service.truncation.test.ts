import { describe, expect, it, vi } from "vitest"
import InvalidCurrentPasswordError from "../errors/InvalidCurrentPasswordError"
import { MockAuthRepository } from "../repositories/mock/authMock.repository"
import { PasswordHasher } from "../utils/passwordHasher"
import { createSessionTokens } from "../utils/sessionToken"
import { createAuthService } from "./auth.service"
import { LoginAttemptLimiter } from "./loginAttemptLimiter.service"

const NOW = Date.UTC(2030, 0, 1, 12, 0, 0)
const FIRST_72_BYTES = "a".repeat(72)

function setup() {
    const users = new MockAuthRepository([
        { id: 1, email: "admin@exemplo.test", passwordHash: `hash:${FIRST_72_BYTES}`, name: "Admin", isAdmin: true },
    ])
    const truncate = (password: string) => Buffer.from(password, "utf8").subarray(0, 72).toString("utf8")
    const hasher: PasswordHasher = {
        hash: vi.fn(async (password: string) => `hash:${truncate(password)}`),
        compare: vi.fn(async (password: string, passwordHash: string) => passwordHash === `hash:${truncate(password)}`),
    }
    const limiter: LoginAttemptLimiter = {
        check: vi.fn(() => ({ blocked: false, retryAfterSeconds: 0 })),
        recordFailure: vi.fn(),
        reset: vi.fn(),
        trackedKeys: vi.fn(() => 0),
    }
    const tokens = createSessionTokens({ secret: () => "test-only-auth-token-secret-with-32-chars", now: () => NOW })
    return { users, service: createAuthService({ users, limiter, hasher, tokens, now: () => NOW }) }
}

describe("senhas acima de 72 bytes nao sao truncadas", () => {
    it("recusa a senha atual cujo inicio de 72 bytes confere na troca de senha", async () => {
        const { service, users } = setup()

        const attempt = service.changePassword(1, `${FIRST_72_BYTES}qualquer-sufixo`, "nova-senha-123")

        await expect(attempt).rejects.toBeInstanceOf(InvalidCurrentPasswordError)
        expect(users.get(1)?.sessionVersion).toBe(0)
    })

    it("aceita a senha atual com exatamente 72 bytes na troca de senha", async () => {
        const { service } = setup()

        const result = await service.changePassword(1, FIRST_72_BYTES, "nova-senha-123")

        expect(result.accessToken).toBeTruthy()
    })
})
