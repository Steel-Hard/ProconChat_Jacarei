import request from "supertest"
import { afterEach, describe, expect, test, vi } from "vitest"
import app from "../app"

vi.mock("../repositories/auth.repository", () => ({
    authRepository: {
        findByEmail: vi.fn().mockResolvedValue(null),
        findActiveById: vi.fn().mockResolvedValue(null),
    },
}))

vi.mock("../utils/passwordHasher", () => ({
    PASSWORD_HASH_COST: 12,
    bcryptPasswordHasher: {
        hash: vi.fn(),
        compare: vi.fn().mockResolvedValue(false),
    },
}))

const ORIGIN = process.env.FRONTEND_ORIGIN as string

describe("log de requisicao do login", () => {
    afterEach(() => vi.restoreAllMocks())

    test("nao registra senha, e-mail, cookies nem Authorization", async () => {
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined)
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
        const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined)
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined)

        await request(app)
            .post("/api/v1/auth/login")
            .set("Origin", ORIGIN)
            .set("Cookie", "proconchat_access=cookie-secreto-123")
            .set("Authorization", "Bearer bearer-secreto-456")
            .send({ email: "pessoa-secreta@exemplo.test", password: "senha-secreta-789" })
        await request(app)
            .post("/api/v1/auth/login")
            .set("Origin", ORIGIN)
            .set("Content-Type", "application/json")
            .send('{"email":"pessoa-secreta@exemplo.test","password":"senha-secreta-789"')
        await new Promise((resolve) => setTimeout(resolve, 20))

        const logged = [logSpy, errorSpy, infoSpy, warnSpy]
            .flatMap((spy) => spy.mock.calls)
            .map((call) => call.map((part) => (part instanceof Error ? `${part.message}${part.stack}` : String(part))).join(" "))
            .join("\n")
        expect(logSpy).toHaveBeenCalled()
        for (const secret of ["senha-secreta-789", "pessoa-secreta", "cookie-secreto-123", "bearer-secreto-456"]) {
            expect(logged).not.toContain(secret)
        }
    })
})
