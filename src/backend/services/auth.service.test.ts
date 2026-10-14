import { describe, expect, it, vi } from "vitest"
import BadRequestError from "../errors/BadRequestError"
import InvalidCurrentPasswordError from "../errors/InvalidCurrentPasswordError"
import TooManyRequestsError from "../errors/TooManyRequestsError"
import UnauthorizedError from "../errors/UnauthorizedError"
import { MockAuthRepository } from "../repositories/authMock.repository"
import { PERMISSIONS } from "../types/auth.types"
import { PasswordHasher } from "../utils/passwordHasher"
import { createSessionTokens, REFRESH_TOKEN_TTL_MS } from "../utils/sessionToken"
import { createAuthService } from "./auth.service"
import { LoginAttemptLimiter } from "./loginAttemptLimiter.service"

const NOW = Date.UTC(2030, 0, 1, 12, 0, 0)
const IP = "198.51.100.7"

function setup({ blocked = false } = {}) {
    const users = new MockAuthRepository([
        { id: 1, email: "admin@exemplo.test", passwordHash: "hash:senha-do-admin", name: "Admin", isAdmin: true, sessionVersion: 2 },
        { id: 2, email: "inativa@exemplo.test", passwordHash: "hash:senha-da-inativa", active: false },
        { id: 3, email: "equipe@exemplo.test", passwordHash: "hash:senha-da-equipe" },
    ])
    const hasher: PasswordHasher = {
        hash: vi.fn(async (password: string) => `hash:${password}`),
        compare: vi.fn(async (password: string, passwordHash: string) => passwordHash === `hash:${password}`),
    }
    const limiter: LoginAttemptLimiter = {
        check: vi.fn(() => (blocked ? { blocked: true, retryAfterSeconds: 300 } : { blocked: false, retryAfterSeconds: 0 })),
        recordFailure: vi.fn(),
        reset: vi.fn(),
        trackedKeys: vi.fn(() => 0),
    }
    const tokens = createSessionTokens({ secret: () => "test-only-auth-token-secret-with-32-chars", now: () => NOW })
    const findByEmail = vi.spyOn(users, "findByEmail")
    const service = createAuthService({ users, limiter, hasher, tokens, now: () => NOW })
    return { service, users, hasher, limiter, tokens, findByEmail }
}

describe("authService.login", () => {
    it("devolve o usuario publico e os tokens quando a senha confere", async () => {
        const { service, users, tokens } = setup()

        const result = await service.login({ email: "admin@exemplo.test", password: "senha-do-admin", ip: IP })

        expect(result.user).toEqual({ id: 1, name: "Admin", email: "admin@exemplo.test", isAdmin: true, permissions: [...PERMISSIONS] })
        expect(Object.keys(result.user)).not.toContain("passwordHash")
        expect(Object.keys(result.user)).not.toContain("sessionVersion")
        expect(tokens.verifyAccessToken(result.accessToken)).toEqual({ userId: 1, sessionVersion: 2 })
        expect(tokens.verifyRefreshToken(result.refreshToken)).toEqual({ userId: 1, sessionVersion: 2 })
        expect(result.refreshExpiresAt).toEqual(new Date(NOW + REFRESH_TOKEN_TTL_MS))
        expect(users.loginsRecorded).toEqual([1])
    })

    it("recusa a senha errada com 401 e mensagem unica", async () => {
        const { service, users } = setup()

        const attempt = service.login({ email: "admin@exemplo.test", password: "senha-errada", ip: IP })

        await expect(attempt).rejects.toEqual(new UnauthorizedError("Invalid email or password"))
        expect(users.loginsRecorded).toEqual([])
    })

    it("compara com bcrypt tambem quando o e-mail nao existe", async () => {
        const { service, hasher } = setup()

        const attempt = service.login({ email: "ninguem@exemplo.test", password: "qualquer-senha", ip: IP })

        await expect(attempt).rejects.toEqual(new UnauthorizedError("Invalid email or password"))
        expect(hasher.compare).toHaveBeenCalledTimes(1)
        expect(vi.mocked(hasher.compare).mock.calls[0]?.[1]).toMatch(/^\$2[ab]\$12\$/)
    })

    it("recusa a conta inativa com a mesma mensagem mesmo com a senha certa", async () => {
        const { service, hasher } = setup()

        const attempt = service.login({ email: "inativa@exemplo.test", password: "senha-da-inativa", ip: IP })

        await expect(attempt).rejects.toEqual(new UnauthorizedError("Invalid email or password"))
        expect(hasher.compare).toHaveBeenCalledTimes(1)
    })

    it("recusa a senha acima de 72 bytes mesmo que o inicio confira", async () => {
        const { service, users, hasher } = setup()
        users.add({ id: 9, email: "longa@exemplo.test", passwordHash: `hash:${"a".repeat(72)}` })
        vi.mocked(hasher.compare).mockImplementation(async (password, passwordHash) =>
            passwordHash === `hash:${Buffer.from(password).subarray(0, 72).toString()}`,
        )

        const attempt = service.login({ email: "longa@exemplo.test", password: `${"a".repeat(72)}zz`, ip: IP })

        await expect(attempt).rejects.toBeInstanceOf(UnauthorizedError)
        expect(hasher.compare).toHaveBeenCalledTimes(1)
    })

    it("lanca 429 com o tempo de espera sem consultar o repositorio quando esta bloqueado", async () => {
        const { service, findByEmail, hasher } = setup({ blocked: true })

        const attempt = service.login({ email: "admin@exemplo.test", password: "senha-do-admin", ip: IP })

        await expect(attempt).rejects.toBeInstanceOf(TooManyRequestsError)
        await expect(attempt).rejects.toMatchObject({ retryAfterSeconds: 300, statusCode: 429 })
        expect(findByEmail).not.toHaveBeenCalled()
        expect(hasher.compare).not.toHaveBeenCalled()
    })

    it("registra a falha no limitador pelo IP e e-mail normalizado", async () => {
        const { service, limiter } = setup()

        await service.login({ email: " Admin@Exemplo.test ", password: "senha-errada", ip: IP }).catch(() => undefined)

        expect(limiter.recordFailure).toHaveBeenCalledWith({ ip: IP, email: "admin@exemplo.test" })
        expect(limiter.reset).not.toHaveBeenCalled()
    })

    it("zera o contador do par quando o login da certo", async () => {
        const { service, limiter } = setup()

        await service.login({ email: "admin@exemplo.test", password: "senha-do-admin", ip: IP })

        expect(limiter.reset).toHaveBeenCalledWith({ ip: IP, email: "admin@exemplo.test" })
        expect(limiter.recordFailure).not.toHaveBeenCalled()
    })

    it("normaliza o e-mail com maiusculas e espacos", async () => {
        const { service, findByEmail, limiter } = setup()

        const result = await service.login({ email: "  ADMIN@Exemplo.TEST  ", password: "senha-do-admin", ip: IP })

        expect(result.user.id).toBe(1)
        expect(findByEmail).toHaveBeenCalledWith("admin@exemplo.test")
        expect(limiter.check).toHaveBeenCalledWith({ ip: IP, email: "admin@exemplo.test" })
    })
})

describe("authService.refresh", () => {
    it("devolve so um novo token de acesso para o refresh valido", async () => {
        const { service, tokens } = setup()
        const refreshToken = tokens.signRefreshToken({ userId: 1, sessionVersion: 2, expiresAt: new Date(NOW + 1000) })

        const result = await service.refresh(refreshToken)

        expect(Object.keys(result)).toEqual(["accessToken"])
        expect(tokens.verifyAccessToken(result.accessToken)).toEqual({ userId: 1, sessionVersion: 2 })
    })

    it("recusa o refresh com session_version antiga", async () => {
        const { service, tokens } = setup()
        const refreshToken = tokens.signRefreshToken({ userId: 1, sessionVersion: 1, expiresAt: new Date(NOW + 1000) })

        await expect(service.refresh(refreshToken)).rejects.toBeInstanceOf(UnauthorizedError)
    })

    it("recusa o refresh de conta inativa", async () => {
        const { service, tokens } = setup()
        const refreshToken = tokens.signRefreshToken({ userId: 2, sessionVersion: 0, expiresAt: new Date(NOW + 1000) })

        await expect(service.refresh(refreshToken)).rejects.toBeInstanceOf(UnauthorizedError)
    })

    it("recusa o token de acesso no lugar do refresh", async () => {
        const { service, tokens } = setup()
        const accessToken = tokens.signAccessToken({ userId: 1, sessionVersion: 2 })

        await expect(service.refresh(accessToken)).rejects.toBeInstanceOf(UnauthorizedError)
    })

    it("recusa quando nao ha cookie de refresh", async () => {
        const { service } = setup()

        await expect(service.refresh(undefined)).rejects.toBeInstanceOf(UnauthorizedError)
    })
})

describe("authService.logout", () => {
    it("nao toca no repositorio nem na session_version", async () => {
        const { service, users } = setup()
        const spies = [
            vi.spyOn(users, "findActiveById"),
            vi.spyOn(users, "updatePassword"),
            vi.spyOn(users, "recordLogin"),
        ]

        await service.logout()

        spies.forEach((spy) => expect(spy).not.toHaveBeenCalled())
        expect(users.get(1)?.sessionVersion).toBe(2)
    })
})

describe("authService.changePassword", () => {
    it("grava o novo hash, incrementa a versao e devolve o novo par de tokens", async () => {
        const { service, users, tokens } = setup()

        const result = await service.changePassword(1, "senha-do-admin", "nova-senha-123")

        expect(users.get(1)).toMatchObject({ passwordHash: "hash:nova-senha-123", sessionVersion: 3 })
        expect(tokens.verifyAccessToken(result.accessToken)).toEqual({ userId: 1, sessionVersion: 3 })
        expect(tokens.verifyRefreshToken(result.refreshToken)).toEqual({ userId: 1, sessionVersion: 3 })
        expect(result.refreshExpiresAt).toEqual(new Date(NOW + REFRESH_TOKEN_TTL_MS))
    })

    it("lanca INVALID_CURRENT_PASSWORD sem alterar nada quando a senha atual nao confere", async () => {
        const { service, users } = setup()

        const attempt = service.changePassword(1, "senha-errada", "nova-senha-123")

        await expect(attempt).rejects.toBeInstanceOf(InvalidCurrentPasswordError)
        await expect(attempt).rejects.toMatchObject({ statusCode: 400, code: "INVALID_CURRENT_PASSWORD" })
        expect(users.get(1)).toMatchObject({ passwordHash: "hash:senha-do-admin", sessionVersion: 2 })
    })

    it("recusa a nova senha com menos de 8 caracteres", async () => {
        const { service, users } = setup()

        await expect(service.changePassword(1, "senha-do-admin", "curta")).rejects.toEqual(
            new BadRequestError("Password must contain at least 8 characters"),
        )
        expect(users.get(1)?.sessionVersion).toBe(2)
    })

    it("recusa a nova senha acima de 72 bytes", async () => {
        const { service, users } = setup()

        await expect(service.changePassword(1, "senha-do-admin", "é".repeat(37))).rejects.toEqual(
            new BadRequestError("Password must not exceed 72 bytes"),
        )
        expect(users.get(1)?.sessionVersion).toBe(2)
    })

    it("valida a nova senha antes de comparar a atual", async () => {
        const { service, hasher } = setup()

        await expect(service.changePassword(1, "senha-errada", "curta")).rejects.toBeInstanceOf(BadRequestError)
        expect(hasher.compare).not.toHaveBeenCalled()
    })

    it("recusa com 401 quando a conta nao esta mais ativa", async () => {
        const { service } = setup()

        await expect(service.changePassword(2, "senha-da-inativa", "nova-senha-123")).rejects.toBeInstanceOf(UnauthorizedError)
    })
})
