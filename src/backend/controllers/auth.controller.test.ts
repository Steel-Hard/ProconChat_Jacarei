import { Request, Response } from "express"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import AuthController from "./auth.controller"
import BadRequestError from "../errors/BadRequestError"
import InvalidCurrentPasswordError from "../errors/InvalidCurrentPasswordError"
import TooManyRequestsError from "../errors/TooManyRequestsError"
import UnauthorizedError from "../errors/UnauthorizedError"
import { AuthService } from "../services/auth.service"
import { AuthenticatedUser, PERMISSIONS } from "../types/auth.types"
import {
    ACCESS_COOKIE_NAME,
    REFRESH_COOKIE_NAME,
    accessCookieOptions,
    clearAccessCookieOptions,
    clearRefreshCookieOptions,
} from "../utils/sessionCookies"

const user = { id: 1, name: "Admin", email: "admin@exemplo.test", isAdmin: true, permissions: [...PERMISSIONS] }
const authenticatedUser: AuthenticatedUser = { ...user, sessionVersion: 2 }
const refreshCookieShape = expect.objectContaining({ path: "/api/v1/auth", httpOnly: true, sameSite: "strict" })

function buildAuthService() {
    return {
        login: vi.fn<AuthService["login"]>(),
        refresh: vi.fn<AuthService["refresh"]>(),
        logout: vi.fn<AuthService["logout"]>(),
        changePassword: vi.fn<AuthService["changePassword"]>(),
    }
}

function issuedSession() {
    return {
        accessToken: "token-de-acesso",
        refreshToken: "token-de-refresh",
        refreshExpiresAt: new Date(Date.now() + 60_000),
    }
}

function buildRequest(fields: Record<string, unknown> = {}): Request {
    return { headers: {}, ...fields } as unknown as Request
}

function buildResponse(): Response {
    const res = {} as Response
    res.status = vi.fn().mockReturnValue(res)
    res.json = vi.fn().mockReturnValue(res)
    res.cookie = vi.fn().mockReturnValue(res)
    res.clearCookie = vi.fn().mockReturnValue(res)
    res.set = vi.fn().mockReturnValue(res)
    res.end = vi.fn().mockReturnValue(res)
    return res
}

const env = () => ({ NODE_ENV: process.env.NODE_ENV })

describe("AuthController", () => {
    let auth: ReturnType<typeof buildAuthService>
    let controller: AuthController

    beforeEach(() => {
        auth = buildAuthService()
        controller = new AuthController({ auth })
    })

    afterEach(() => {
        vi.unstubAllEnvs()
    })

    test("login responde 200 com { data: { user } } e define os cookies de acesso e de refresh", async () => {
        auth.login.mockResolvedValue({ user, ...issuedSession() })
        const req = buildRequest({ body: { email: "admin@exemplo.test", password: "senha-do-admin" }, ip: "203.0.113.7" })
        const res = buildResponse()
        const next = vi.fn()

        await controller.login(req, res, next)

        expect(auth.login).toHaveBeenCalledWith({ email: "admin@exemplo.test", password: "senha-do-admin", ip: "203.0.113.7" })
        expect(res.cookie).toHaveBeenCalledWith(ACCESS_COOKIE_NAME, "token-de-acesso", accessCookieOptions(env()))
        expect(res.cookie).toHaveBeenCalledWith(REFRESH_COOKIE_NAME, "token-de-refresh", refreshCookieShape)
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith({ data: { user } })
        expect(next).not.toHaveBeenCalled()
    })

    test.each([
        { label: "so email", body: { email: "admin@exemplo.test" } },
        { label: "email numero e senha lista", body: { email: 42, password: ["senha"] } },
        { label: "corpo ausente", body: undefined },
        { label: "email so com espacos", body: { email: "   ", password: "senha-do-admin" } },
    ])(
        "login delega BadRequestError ao next sem chamar o servico quando email e senha nao sao texto preenchido ($label)",
        async ({ body }) => {
            const req = buildRequest({ body })
            const res = buildResponse()
            const next = vi.fn()

            await controller.login(req, res, next)

            expect(next).toHaveBeenCalledWith(expect.any(BadRequestError))
            expect(next.mock.calls[0][0].message).toBe("email and password must be non-empty strings")
            expect(auth.login).not.toHaveBeenCalled()
            expect(res.status).not.toHaveBeenCalled()
        },
    )

    test("login delega BadRequestError ao next quando o email passa de 254 caracteres depois do trim", async () => {
        const email = `${"a".repeat(242)}@exemplo.test`
        const req = buildRequest({ body: { email: `  ${email}  `, password: "senha-do-admin" } })
        const res = buildResponse()
        const next = vi.fn()

        await controller.login(req, res, next)

        expect(email.length).toBe(255)
        expect(next).toHaveBeenCalledWith(expect.any(BadRequestError))
        expect(next.mock.calls[0][0].message).toBe("email must not exceed 254 characters")
        expect(auth.login).not.toHaveBeenCalled()
    })

    test("login aceita o email de 254 caracteres com espacos nas pontas e repassa o email original ao servico", async () => {
        auth.login.mockResolvedValue({ user, ...issuedSession() })
        const email = `  ${"a".repeat(241)}@exemplo.test  `
        const req = buildRequest({ body: { email, password: "senha-do-admin" }, ip: "203.0.113.7" })
        const res = buildResponse()
        const next = vi.fn()

        await controller.login(req, res, next)

        expect(email.trim().length).toBe(254)
        expect(auth.login).toHaveBeenCalledWith({ email, password: "senha-do-admin", ip: "203.0.113.7" })
        expect(res.status).toHaveBeenCalledWith(200)
        expect(next).not.toHaveBeenCalled()
    })

    test.each([
        ["o req.ip quando ele existe", "198.51.100.4", "198.51.100.4"],
        ["texto vazio quando o req.ip nao existe", undefined, ""],
    ])("login repassa ao servico %s", async (_label, ip, expectedIp) => {
        auth.login.mockResolvedValue({ user, ...issuedSession() })
        const body = { email: "admin@exemplo.test", password: "senha-do-admin" }

        await controller.login(buildRequest({ body, ip }), buildResponse(), vi.fn())

        expect(auth.login).toHaveBeenCalledWith({ ...body, ip: expectedIp })
    })

    test("login define Retry-After e delega ao next quando o servico rejeita com TooManyRequestsError", async () => {
        const error = new TooManyRequestsError("Too many login attempts", 120)
        auth.login.mockRejectedValue(error)
        const req = buildRequest({ body: { email: "admin@exemplo.test", password: "senha-errada" } })
        const res = buildResponse()
        const next = vi.fn()

        await controller.login(req, res, next)

        expect(res.set).toHaveBeenCalledWith("Retry-After", "120")
        expect(next).toHaveBeenCalledWith(error)
        expect(res.cookie).not.toHaveBeenCalled()
    })

    test("login delega ao next sem definir cookies quando o servico rejeita com UnauthorizedError", async () => {
        const error = new UnauthorizedError("Invalid email or password")
        auth.login.mockRejectedValue(error)
        const req = buildRequest({ body: { email: "admin@exemplo.test", password: "senha-errada" } })
        const res = buildResponse()
        const next = vi.fn()

        await controller.login(req, res, next)

        expect(next).toHaveBeenCalledWith(error)
        expect(res.cookie).not.toHaveBeenCalled()
        expect(res.set).not.toHaveBeenCalled()
        expect(res.status).not.toHaveBeenCalled()
    })

    test("refresh le o cookie de refresh, define so o cookie de acesso e responde 204", async () => {
        auth.refresh.mockResolvedValue({ accessToken: "token-novo" })
        const req = buildRequest({ headers: { cookie: "outro=1; proconchat_refresh=token-de-refresh" } })
        const res = buildResponse()
        const next = vi.fn()

        await controller.refresh(req, res, next)

        expect(auth.refresh).toHaveBeenCalledWith("token-de-refresh")
        expect(res.cookie).toHaveBeenCalledTimes(1)
        expect(res.cookie).toHaveBeenCalledWith(ACCESS_COOKIE_NAME, "token-novo", accessCookieOptions(env()))
        expect(res.status).toHaveBeenCalledWith(204)
        expect(res.end).toHaveBeenCalled()
        expect(next).not.toHaveBeenCalled()
    })

    test("refresh limpa os dois cookies e delega ao next quando o servico rejeita com UnauthorizedError", async () => {
        const error = new UnauthorizedError("Invalid or expired session")
        auth.refresh.mockRejectedValue(error)
        const res = buildResponse()
        const next = vi.fn()

        await controller.refresh(buildRequest(), res, next)

        expect(auth.refresh).toHaveBeenCalledWith(undefined)
        expect(res.clearCookie).toHaveBeenCalledWith(ACCESS_COOKIE_NAME, clearAccessCookieOptions(env()))
        expect(res.clearCookie).toHaveBeenCalledWith(REFRESH_COOKIE_NAME, clearRefreshCookieOptions(env()))
        expect(next).toHaveBeenCalledWith(error)
        expect(res.status).not.toHaveBeenCalled()
    })

    test("refresh delega ao next sem limpar cookies quando o servico falha com outro erro", async () => {
        const error = new Error("falha inesperada")
        auth.refresh.mockRejectedValue(error)
        const res = buildResponse()
        const next = vi.fn()

        await controller.refresh(buildRequest(), res, next)

        expect(next).toHaveBeenCalledWith(error)
        expect(res.clearCookie).not.toHaveBeenCalled()
        expect(res.cookie).not.toHaveBeenCalled()
    })

    test("logout chama o servico, limpa os dois cookies e responde 204", async () => {
        auth.logout.mockResolvedValue()
        const res = buildResponse()
        const next = vi.fn()

        await controller.logout(buildRequest(), res, next)

        expect(auth.logout).toHaveBeenCalledTimes(1)
        expect(res.clearCookie).toHaveBeenCalledWith(ACCESS_COOKIE_NAME, clearAccessCookieOptions(env()))
        expect(res.clearCookie).toHaveBeenCalledWith(REFRESH_COOKIE_NAME, clearRefreshCookieOptions(env()))
        expect(res.status).toHaveBeenCalledWith(204)
        expect(res.end).toHaveBeenCalled()
        expect(next).not.toHaveBeenCalled()
    })

    test("logout delega ao next sem limpar cookies quando o servico falha", async () => {
        const error = new Error("falha inesperada")
        auth.logout.mockRejectedValue(error)
        const res = buildResponse()
        const next = vi.fn()

        await controller.logout(buildRequest(), res, next)

        expect(next).toHaveBeenCalledWith(error)
        expect(res.clearCookie).not.toHaveBeenCalled()
        expect(res.status).not.toHaveBeenCalled()
    })

    test("me responde 200 com a conta publica, sem sessionVersion", () => {
        const res = buildResponse()
        const next = vi.fn()

        controller.me(buildRequest({ authUser: authenticatedUser }), res, next)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith({ data: user })
        expect(vi.mocked(res.json).mock.calls[0][0].data).not.toHaveProperty("sessionVersion")
        expect(next).not.toHaveBeenCalled()
    })

    test("me delega UnauthorizedError ao next quando nao ha usuario autenticado", () => {
        const res = buildResponse()
        const next = vi.fn()

        controller.me(buildRequest(), res, next)

        expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError))
        expect(next.mock.calls[0][0].message).toBe("Authentication required")
        expect(res.status).not.toHaveBeenCalled()
    })

    test("changePassword troca a senha do usuario autenticado, reemite os dois cookies e responde 200 com { data: { changed: true } }", async () => {
        auth.changePassword.mockResolvedValue(issuedSession())
        const req = buildRequest({
            authUser: authenticatedUser,
            body: { currentPassword: "senha-atual", newPassword: "senha-nova-forte" },
        })
        const res = buildResponse()
        const next = vi.fn()

        await controller.changePassword(req, res, next)

        expect(auth.changePassword).toHaveBeenCalledWith(1, "senha-atual", "senha-nova-forte")
        expect(res.cookie).toHaveBeenCalledWith(ACCESS_COOKIE_NAME, "token-de-acesso", accessCookieOptions(env()))
        expect(res.cookie).toHaveBeenCalledWith(REFRESH_COOKIE_NAME, "token-de-refresh", refreshCookieShape)
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith({ data: { changed: true } })
        expect(next).not.toHaveBeenCalled()
    })

    test("changePassword delega UnauthorizedError ao next sem chamar o servico quando nao ha usuario autenticado", async () => {
        const req = buildRequest({ body: { currentPassword: "senha-atual", newPassword: "senha-nova-forte" } })
        const res = buildResponse()
        const next = vi.fn()

        await controller.changePassword(req, res, next)

        expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError))
        expect(next.mock.calls[0][0].message).toBe("Authentication required")
        expect(auth.changePassword).not.toHaveBeenCalled()
    })

    test("changePassword delega BadRequestError ao next sem chamar o servico quando as senhas nao sao texto preenchido", async () => {
        const req = buildRequest({ authUser: authenticatedUser, body: { currentPassword: "senha-atual", newPassword: 123 } })
        const res = buildResponse()
        const next = vi.fn()

        await controller.changePassword(req, res, next)

        expect(next).toHaveBeenCalledWith(expect.any(BadRequestError))
        expect(next.mock.calls[0][0].message).toBe("currentPassword and newPassword must be non-empty strings")
        expect(auth.changePassword).not.toHaveBeenCalled()
    })

    test("changePassword delega ao next sem definir cookies quando o servico rejeita com InvalidCurrentPasswordError", async () => {
        const error = new InvalidCurrentPasswordError("Current password does not match")
        auth.changePassword.mockRejectedValue(error)
        const req = buildRequest({
            authUser: authenticatedUser,
            body: { currentPassword: "senha-errada", newPassword: "senha-nova-forte" },
        })
        const res = buildResponse()
        const next = vi.fn()

        await controller.changePassword(req, res, next)

        expect(next).toHaveBeenCalledWith(error)
        expect(res.cookie).not.toHaveBeenCalled()
        expect(res.status).not.toHaveBeenCalled()
    })

    test("le o NODE_ENV na hora da requisicao e marca os cookies como secure em producao", async () => {
        auth.logout.mockResolvedValue()
        const res = buildResponse()
        vi.stubEnv("NODE_ENV", "production")

        await controller.logout(buildRequest(), res, vi.fn())

        expect(res.clearCookie).toHaveBeenCalledWith(ACCESS_COOKIE_NAME, expect.objectContaining({ secure: true }))
        expect(res.clearCookie).toHaveBeenCalledWith(REFRESH_COOKIE_NAME, expect.objectContaining({ secure: true }))
    })
})
