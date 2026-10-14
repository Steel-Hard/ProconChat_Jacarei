import request from "supertest"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import app from "../app"
import { authRepository } from "../repositories/auth.repository"
import { MockAuthRepository } from "../repositories/mock/authMock.repository"

vi.mock("../repositories/auth.repository", async () => {
    const { MockAuthRepository: Repository } = await import("../repositories/mock/authMock.repository")
    return {
        authRepository: new Repository([
            { id: 1, email: "admin@exemplo.test", passwordHash: "hash:senha-do-admin", name: "Admin", isAdmin: true },
        ]),
    }
})

vi.mock("../utils/sessionToken", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../utils/sessionToken")>()
    return {
        ...actual,
        sessionTokens: actual.createSessionTokens({ secret: () => process.env.AUTH_TOKEN_SECRET, now: () => Date.now() }),
    }
})

vi.mock("../services/auth.service", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../services/auth.service")>()
    const { authRepository: users } = await import("../repositories/auth.repository")
    const { sessionTokens: tokens } = await import("../utils/sessionToken")
    const { bcryptPasswordHasher: hasher } = await import("../utils/passwordHasher")
    const { loginAttemptLimiter: limiter } = await import("../services/loginAttemptLimiter.service")
    return {
        ...actual,
        authService: actual.createAuthService({ users, limiter, hasher, tokens, now: () => Date.now() }),
    }
})

vi.mock("../utils/passwordHasher", () => ({
    PASSWORD_HASH_COST: 12,
    bcryptPasswordHasher: {
        hash: async (password: string) => `hash:${password}`,
        compare: async (password: string, passwordHash: string) => passwordHash === `hash:${password}`,
    },
}))

const ORIGIN = process.env.FRONTEND_ORIGIN as string
const START = Date.UTC(2031, 2, 1, 12, 0, 0)
const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const mockRepository = authRepository as unknown as MockAuthRepository

function setCookies(response: request.Response): string[] {
    return (response.headers["set-cookie"] as unknown as string[] | undefined) ?? []
}

function cookieNamed(response: request.Response, name: string): string | undefined {
    return setCookies(response).find((cookie) => cookie.startsWith(`${name}=`))
}

function valueOf(response: request.Response, name: string): string {
    return (cookieNamed(response, name) ?? "").split(";")[0] ?? ""
}

function at(offsetMs: number) {
    vi.setSystemTime(START + offsetMs)
}

async function loginAtStart() {
    at(0)
    return request(app)
        .post("/api/v1/auth/login")
        .set("Origin", ORIGIN)
        .set("X-Forwarded-For", `203.0.113.${Math.floor(Math.random() * 200) + 1}`)
        .send({ email: "admin@exemplo.test", password: "senha-do-admin" })
}

function me(access: string) {
    return request(app).get("/api/v1/auth/me").set("Cookie", access)
}

function refresh(refreshCookie: string) {
    return request(app).post("/api/v1/auth/refresh").set("Origin", ORIGIN).set("Cookie", refreshCookie)
}

describe("vida da sessao por cookies", () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ["Date"] })
        at(0)
    })

    afterEach(() => {
        mockRepository.add({ id: 1, email: "admin@exemplo.test", passwordHash: "hash:senha-do-admin", name: "Admin", isAdmin: true })
        vi.useRealTimers()
        vi.unstubAllEnvs()
        vi.restoreAllMocks()
    })

    test("o cookie de acesso vale ate 59 minutos e deixa de valer com 1 hora", async () => {
        const login = await loginAtStart()
        const access = valueOf(login, "proconchat_access")

        at(59 * MINUTE + 59 * 1000)
        expect((await me(access)).status).toBe(200)

        at(HOUR)
        expect((await me(access)).status).toBe(401)
    })

    test("o refresh emite um novo acesso valido por mais 1 hora depois de o primeiro vencer", async () => {
        const login = await loginAtStart()
        const refreshCookie = valueOf(login, "proconchat_refresh")

        at(HOUR + MINUTE)
        const renewed = await refresh(refreshCookie)

        expect(renewed.status).toBe(204)
        expect(cookieNamed(renewed, "proconchat_access")).toMatch(/Max-Age=3600;/)
        at(HOUR + MINUTE + 59 * MINUTE)
        expect((await me(valueOf(renewed, "proconchat_access"))).status).toBe(200)
    })

    test("o refresh de 90 dias conta do login e nao desliza quando o acesso e renovado", async () => {
        const login = await loginAtStart()
        const refreshCookie = valueOf(login, "proconchat_refresh")

        at(60 * DAY)
        const renewed = await refresh(refreshCookie)
        expect(renewed.status).toBe(204)
        expect(cookieNamed(renewed, "proconchat_refresh")).toBeUndefined()

        at(90 * DAY - 1000)
        expect((await refresh(refreshCookie)).status).toBe(204)

        at(90 * DAY)
        const expired = await refresh(refreshCookie)
        expect(expired.status).toBe(401)
        expect(cookieNamed(expired, "proconchat_access")).toMatch(/^proconchat_access=; Path=\//)
        expect(cookieNamed(expired, "proconchat_refresh")).toMatch(/^proconchat_refresh=; Path=\/api\/v1\/auth/)
    })

    test("o login define o refresh com 90 dias de Max-Age e o acesso com 1 hora", async () => {
        const login = await loginAtStart()

        expect(cookieNamed(login, "proconchat_access")).toMatch(/Max-Age=3600;/)
        expect(cookieNamed(login, "proconchat_refresh")).toMatch(/Max-Age=7776000;/)
    })

    test("a troca de senha reemite o refresh com 90 dias contados da troca", async () => {
        const login = await loginAtStart()

        at(30 * DAY)
        const renewed = await refresh(valueOf(login, "proconchat_refresh"))
        const changed = await request(app)
            .post("/api/v1/auth/change-password")
            .set("Origin", ORIGIN)
            .set("Cookie", valueOf(renewed, "proconchat_access"))
            .send({ currentPassword: "senha-do-admin", newPassword: "senha-nova-123" })

        expect(changed.status).toBe(200)
        expect(cookieNamed(changed, "proconchat_refresh")).toMatch(/Max-Age=7776000;/)
        const newRefresh = valueOf(changed, "proconchat_refresh")
        at(120 * DAY - 1000)
        expect((await refresh(newRefresh)).status).toBe(204)
        at(120 * DAY)
        expect((await refresh(newRefresh)).status).toBe(401)
    })

    test("a troca de senha derruba os cookies antigos no acesso e no refresh", async () => {
        const login = await loginAtStart()
        const oldAccess = valueOf(login, "proconchat_access")
        const oldRefresh = valueOf(login, "proconchat_refresh")

        const changed = await request(app)
            .post("/api/v1/auth/change-password")
            .set("Origin", ORIGIN)
            .set("Cookie", oldAccess)
            .send({ currentPassword: "senha-do-admin", newPassword: "senha-nova-123" })

        expect(changed.status).toBe(200)
        expect((await me(oldAccess)).status).toBe(401)
        const oldRefreshed = await refresh(oldRefresh)
        expect(oldRefreshed.status).toBe(401)
        expect(setCookies(oldRefreshed)).toHaveLength(2)
        expect((await me(valueOf(changed, "proconchat_access"))).status).toBe(200)
        expect((await refresh(valueOf(changed, "proconchat_refresh"))).status).toBe(204)
    })

    test("o logout nao derruba a sessao copiada em outro lugar", async () => {
        const login = await loginAtStart()
        const access = valueOf(login, "proconchat_access")
        const versionBefore = mockRepository.get(1)?.sessionVersion

        const loggedOut = await request(app).post("/api/v1/auth/logout").set("Origin", ORIGIN).set("Cookie", access)

        expect(loggedOut.status).toBe(204)
        expect(mockRepository.get(1)?.sessionVersion).toBe(versionBefore)
        expect((await me(access)).status).toBe(200)
    })

    test("a conta que ficou inativa perde o acesso e o refresh na hora", async () => {
        const login = await loginAtStart()
        vi.spyOn(authRepository, "findActiveById").mockResolvedValue(null)

        const meResponse = await me(valueOf(login, "proconchat_access"))
        const refreshResponse = await refresh(valueOf(login, "proconchat_refresh"))

        expect(meResponse.status).toBe(401)
        expect(refreshResponse.status).toBe(401)
        expect(setCookies(refreshResponse)).toHaveLength(2)
    })

    test("marca os dois cookies como Secure em producao e nao marca fora dela", async () => {
        const development = await loginAtStart()
        vi.stubEnv("NODE_ENV", "production")
        const production = await loginAtStart()

        setCookies(development).forEach((cookie) => expect(cookie).not.toMatch(/; Secure/))
        expect(setCookies(production)).toHaveLength(2)
        setCookies(production).forEach((cookie) => expect(cookie).toMatch(/; HttpOnly; Secure; SameSite=Strict$/))
    })

    test("o cookie de refresh nao autentica como acesso e o de acesso nao renova", async () => {
        const login = await loginAtStart()

        const refreshAsAccess = await me(valueOf(login, "proconchat_refresh").replace("proconchat_refresh", "proconchat_access"))
        const accessAsRefresh = await refresh(valueOf(login, "proconchat_access").replace("proconchat_access", "proconchat_refresh"))

        expect(refreshAsAccess.status).toBe(401)
        expect(accessAsRefresh.status).toBe(401)
    })
})
