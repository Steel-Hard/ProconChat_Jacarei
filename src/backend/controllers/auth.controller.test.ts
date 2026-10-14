import request from "supertest"
import { beforeEach, describe, expect, test, vi } from "vitest"
import app from "../app"
import InvalidCurrentPasswordError from "../errors/InvalidCurrentPasswordError"
import TooManyRequestsError from "../errors/TooManyRequestsError"
import UnauthorizedError from "../errors/UnauthorizedError"
import { authRepository } from "../repositories/auth.repository"
import { authService } from "../services/auth.service"
import { PERMISSIONS } from "../types/auth.types"
import { sessionTokens } from "../utils/sessionToken"

vi.mock("../services/auth.service", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../services/auth.service")>()),
    authService: {
        login: vi.fn(),
        refresh: vi.fn(),
        logout: vi.fn(),
        changePassword: vi.fn(),
    },
}))

vi.mock("../repositories/auth.repository", () => ({
    authRepository: {
        findActiveById: vi.fn(),
    },
}))

const ORIGIN = "http://localhost:5173"
const NINETY_DAYS_SECONDS = 90 * 24 * 60 * 60

const user = { id: 1, name: "Admin", email: "admin@exemplo.test", isAdmin: true, permissions: [...PERMISSIONS] }
const authenticatedUser = { ...user, sessionVersion: 2 }

function issuedSession() {
    return {
        accessToken: "token-de-acesso",
        refreshToken: "token-de-refresh",
        refreshExpiresAt: new Date(Date.now() + NINETY_DAYS_SECONDS * 1000),
    }
}

function cookiesOf(response: request.Response): string[] {
    return (response.headers["set-cookie"] as unknown as string[] | undefined) ?? []
}

function cookieNamed(response: request.Response, name: string): string | undefined {
    return cookiesOf(response).find((cookie) => cookie.startsWith(`${name}=`))
}

function accessCookieFor(userId: number, sessionVersion: number): string {
    return `proconchat_access=${sessionTokens.signAccessToken({ userId, sessionVersion })}`
}

function expectBothCleared(response: request.Response) {
    expect(cookieNamed(response, "proconchat_access")).toMatch(/^proconchat_access=; Path=\/; Expires=Thu, 01 Jan 1970/)
    expect(cookieNamed(response, "proconchat_refresh")).toMatch(/^proconchat_refresh=; Path=\/api\/v1\/auth; Expires=Thu, 01 Jan 1970/)
}

describe("POST /api/v1/auth/login", () => {
    beforeEach(() => vi.clearAllMocks())

    test("responde 200 so com o usuario e define os dois cookies HttpOnly", async () => {
        vi.mocked(authService.login).mockResolvedValue({ user, ...issuedSession() })

        const response = await request(app)
            .post("/api/v1/auth/login")
            .set("Origin", ORIGIN)
            .send({ email: "admin@exemplo.test", password: "senha-do-admin" })

        expect(response.status).toBe(200)
        expect(response.body).toEqual({ data: { user } })
        expect(JSON.stringify(response.body)).not.toContain("token-de")
        expect(response.headers["cache-control"]).toBe("no-store")
        const access = cookieNamed(response, "proconchat_access")
        const refresh = cookieNamed(response, "proconchat_refresh")
        expect(access).toMatch(/^proconchat_access=token-de-acesso; Max-Age=3600; Path=\/; Expires=.+; HttpOnly; SameSite=Strict$/)
        expect(refresh).toMatch(/^proconchat_refresh=token-de-refresh; Max-Age=777599\d; Path=\/api\/v1\/auth; Expires=.+; HttpOnly; SameSite=Strict$/)
    })

    test("responde 400 sem chamar o servico quando faltam os campos ou nao sao texto", async () => {
        const responses = await Promise.all([
            request(app).post("/api/v1/auth/login").set("Origin", ORIGIN).send({ email: "admin@exemplo.test" }),
            request(app).post("/api/v1/auth/login").set("Origin", ORIGIN).send({ email: 1, password: ["x"] }),
            request(app).post("/api/v1/auth/login").set("Origin", ORIGIN),
        ])

        responses.forEach((response) => {
            expect(response.status).toBe(400)
            expect(response.body).toEqual({ error: { code: "BAD_REQUEST", message: "email and password must be non-empty strings" } })
        })
        expect(authService.login).not.toHaveBeenCalled()
    })

    test("responde 400 quando o corpo nao e JSON valido", async () => {
        const response = await request(app)
            .post("/api/v1/auth/login")
            .set("Origin", ORIGIN)
            .set("Content-Type", "application/json")
            .send("{nao e json")

        expect(response.status).toBe(400)
        expect(response.body).toEqual({ error: { code: "BAD_REQUEST", message: "Malformed JSON body" } })
        expect(authService.login).not.toHaveBeenCalled()
    })

    test("responde 401 sem cookies quando as credenciais nao conferem", async () => {
        vi.mocked(authService.login).mockRejectedValue(new UnauthorizedError("Invalid email or password"))

        const response = await request(app)
            .post("/api/v1/auth/login")
            .set("Origin", ORIGIN)
            .send({ email: "admin@exemplo.test", password: "senha-errada" })

        expect(response.status).toBe(401)
        expect(response.body).toEqual({ error: { code: "UNAUTHORIZED", message: "Invalid email or password" } })
        expect(cookiesOf(response)).toEqual([])
    })

    test("responde 429 com Retry-After quando o limitador bloqueia", async () => {
        vi.mocked(authService.login).mockRejectedValue(new TooManyRequestsError("Too many login attempts. Try again later", 840))

        const response = await request(app)
            .post("/api/v1/auth/login")
            .set("Origin", ORIGIN)
            .send({ email: "admin@exemplo.test", password: "senha-do-admin" })

        expect(response.status).toBe(429)
        expect(response.headers["retry-after"]).toBe("840")
        expect(response.body).toEqual({ error: { code: "TOO_MANY_REQUESTS", message: "Too many login attempts. Try again later" } })
    })

    test("passa ao servico o IP do cliente vindo do X-Forwarded-For", async () => {
        vi.mocked(authService.login).mockResolvedValue({ user, ...issuedSession() })

        await request(app)
            .post("/api/v1/auth/login")
            .set("Origin", ORIGIN)
            .set("X-Forwarded-For", "203.0.113.50")
            .send({ email: "admin@exemplo.test", password: "senha-do-admin" })

        expect(authService.login).toHaveBeenCalledWith({ email: "admin@exemplo.test", password: "senha-do-admin", ip: "203.0.113.50" })
    })

    test("responde 403 INVALID_ORIGIN sem Origin e nao chama o servico", async () => {
        const response = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: "admin@exemplo.test", password: "senha-do-admin" })

        expect(response.status).toBe(403)
        expect(response.body).toEqual({ error: { code: "INVALID_ORIGIN", message: "Request origin is not allowed" } })
        expect(authService.login).not.toHaveBeenCalled()
    })
})

describe("POST /api/v1/auth/refresh", () => {
    beforeEach(() => vi.clearAllMocks())

    test("responde 204 e redefine so o cookie de acesso", async () => {
        vi.mocked(authService.refresh).mockResolvedValue({ accessToken: "novo-acesso" })

        const response = await request(app)
            .post("/api/v1/auth/refresh")
            .set("Origin", ORIGIN)
            .set("Cookie", "proconchat_refresh=token-de-refresh")

        expect(response.status).toBe(204)
        expect(authService.refresh).toHaveBeenCalledWith("token-de-refresh")
        expect(response.headers["cache-control"]).toBe("no-store")
        expect(cookiesOf(response)).toHaveLength(1)
        expect(cookieNamed(response, "proconchat_access")).toMatch(/^proconchat_access=novo-acesso; Max-Age=3600; Path=\//)
    })

    test("responde 401 e limpa os dois cookies quando o refresh e recusado", async () => {
        vi.mocked(authService.refresh).mockRejectedValue(new UnauthorizedError("Invalid or expired session"))

        const response = await request(app)
            .post("/api/v1/auth/refresh")
            .set("Origin", ORIGIN)
            .set("Cookie", "proconchat_refresh=velho")

        expect(response.status).toBe(401)
        expect(response.body).toEqual({ error: { code: "UNAUTHORIZED", message: "Invalid or expired session" } })
        expectBothCleared(response)
    })
})

describe("POST /api/v1/auth/logout", () => {
    beforeEach(() => vi.clearAllMocks())

    test("responde 204 e limpa os dois cookies mesmo sem sessao", async () => {
        const response = await request(app).post("/api/v1/auth/logout").set("Origin", ORIGIN)

        expect(response.status).toBe(204)
        expect(authService.logout).toHaveBeenCalledOnce()
        expectBothCleared(response)
    })

    test("responde 204 e limpa os dois cookies com sessao", async () => {
        const response = await request(app)
            .post("/api/v1/auth/logout")
            .set("Origin", ORIGIN)
            .set("Cookie", `${accessCookieFor(1, 2)}; proconchat_refresh=token-de-refresh`)

        expect(response.status).toBe(204)
        expect(authRepository.findActiveById).not.toHaveBeenCalled()
        expectBothCleared(response)
    })
})

describe("GET /api/v1/auth/me", () => {
    beforeEach(() => vi.clearAllMocks())

    test("devolve a conta logada com as 8 chaves para o Admin", async () => {
        vi.mocked(authRepository.findActiveById).mockResolvedValue(authenticatedUser)

        const response = await request(app).get("/api/v1/auth/me").set("Cookie", accessCookieFor(1, 2))

        expect(response.status).toBe(200)
        expect(response.body).toEqual({ data: user })
        expect(response.headers["cache-control"]).toBe("no-store")
    })

    test("responde 401 sem o cookie de acesso", async () => {
        const response = await request(app).get("/api/v1/auth/me")

        expect(response.status).toBe(401)
        expect(response.body).toEqual({ error: { code: "UNAUTHORIZED", message: "Authentication required" } })
    })
})

describe("POST /api/v1/auth/change-password", () => {
    beforeEach(() => vi.clearAllMocks())

    test("responde 200 e reemite os dois cookies", async () => {
        vi.mocked(authRepository.findActiveById).mockResolvedValue(authenticatedUser)
        vi.mocked(authService.changePassword).mockResolvedValue(issuedSession())

        const response = await request(app)
            .post("/api/v1/auth/change-password")
            .set("Origin", ORIGIN)
            .set("Cookie", accessCookieFor(1, 2))
            .send({ currentPassword: "senha-do-admin", newPassword: "nova-senha-123" })

        expect(response.status).toBe(200)
        expect(response.body).toEqual({ data: { changed: true } })
        expect(authService.changePassword).toHaveBeenCalledWith(1, "senha-do-admin", "nova-senha-123")
        expect(cookieNamed(response, "proconchat_access")).toMatch(/^proconchat_access=token-de-acesso; Max-Age=3600; Path=\//)
        expect(cookieNamed(response, "proconchat_refresh")).toMatch(/^proconchat_refresh=token-de-refresh; Max-Age=777599\d; Path=\/api\/v1\/auth/)
    })

    test("responde 400 INVALID_CURRENT_PASSWORD sem cookies quando a senha atual nao confere", async () => {
        vi.mocked(authRepository.findActiveById).mockResolvedValue(authenticatedUser)
        vi.mocked(authService.changePassword).mockRejectedValue(new InvalidCurrentPasswordError("Current password is incorrect"))

        const response = await request(app)
            .post("/api/v1/auth/change-password")
            .set("Origin", ORIGIN)
            .set("Cookie", accessCookieFor(1, 2))
            .send({ currentPassword: "senha-errada", newPassword: "nova-senha-123" })

        expect(response.status).toBe(400)
        expect(response.body).toEqual({ error: { code: "INVALID_CURRENT_PASSWORD", message: "Current password is incorrect" } })
        expect(cookiesOf(response)).toEqual([])
    })

    test("responde 401 sem sessao e nao chama o servico", async () => {
        const response = await request(app)
            .post("/api/v1/auth/change-password")
            .set("Origin", ORIGIN)
            .send({ currentPassword: "senha-do-admin", newPassword: "nova-senha-123" })

        expect(response.status).toBe(401)
        expect(authService.changePassword).not.toHaveBeenCalled()
    })

    test("responde 400 quando os campos nao sao texto", async () => {
        vi.mocked(authRepository.findActiveById).mockResolvedValue(authenticatedUser)

        const response = await request(app)
            .post("/api/v1/auth/change-password")
            .set("Origin", ORIGIN)
            .set("Cookie", accessCookieFor(1, 2))
            .send({ currentPassword: "senha-do-admin" })

        expect(response.status).toBe(400)
        expect(response.body).toEqual({ error: { code: "BAD_REQUEST", message: "currentPassword and newPassword must be non-empty strings" } })
        expect(authService.changePassword).not.toHaveBeenCalled()
    })
})
