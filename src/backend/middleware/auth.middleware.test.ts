import express from "express"
import request from "supertest"
import { describe, expect, it } from "vitest"
import { MockAuthRepository } from "../repositories/authMock.repository"
import { createSessionTokens, ACCESS_TOKEN_TTL_SECONDS } from "../utils/sessionToken"
import { createRequireAuth } from "./auth.middleware"
import errorHandler from "./errorHandler.middleware"

const START = Date.UTC(2030, 0, 1, 12, 0, 0)
const SECRET = "test-only-auth-token-secret-with-32-chars"

function setup() {
    let current = START
    const tokens = createSessionTokens({ secret: () => SECRET, now: () => current })
    const users = new MockAuthRepository([
        { id: 1, email: "admin@exemplo.test", passwordHash: "x", name: "Admin", isAdmin: true, sessionVersion: 4 },
        { id: 2, email: "inativa@exemplo.test", passwordHash: "x", active: false },
    ])
    const app = express()
    app.get("/protegida", createRequireAuth({ users, tokens }), (req, res) => {
        res.status(200).json({ data: { userId: req.authUser?.id } })
    })
    app.use(errorHandler)
    const advance = (ms: number) => {
        current += ms
    }
    return { app, tokens, advance }
}

const unauthorized = { error: { code: "UNAUTHORIZED", message: "Authentication required" } }

describe("requireAuth", () => {
    it("libera a requisicao com o cookie de acesso valido e preenche o usuario", async () => {
        const { app, tokens } = setup()
        const token = tokens.signAccessToken({ userId: 1, sessionVersion: 4 })

        const response = await request(app).get("/protegida").set("Cookie", `proconchat_access=${token}`)

        expect(response.status).toBe(200)
        expect(response.body).toEqual({ data: { userId: 1 } })
    })

    it("responde 401 sem o cookie de acesso", async () => {
        const { app } = setup()

        const response = await request(app).get("/protegida")

        expect(response.status).toBe(401)
        expect(response.body).toEqual(unauthorized)
    })

    it("responde 401 com o cookie adulterado", async () => {
        const { app, tokens } = setup()
        const token = tokens.signAccessToken({ userId: 1, sessionVersion: 4 })

        const response = await request(app).get("/protegida").set("Cookie", `proconchat_access=${token.slice(0, -2)}xx`)

        expect(response.status).toBe(401)
        expect(response.body).toEqual(unauthorized)
    })

    it("responde 401 com o cookie vencido", async () => {
        const { app, tokens, advance } = setup()
        const token = tokens.signAccessToken({ userId: 1, sessionVersion: 4 })
        advance(ACCESS_TOKEN_TTL_SECONDS * 1000)

        const response = await request(app).get("/protegida").set("Cookie", `proconchat_access=${token}`)

        expect(response.status).toBe(401)
        expect(response.body).toEqual(unauthorized)
    })

    it("responde 401 quando o cookie de acesso traz um token de refresh", async () => {
        const { app, tokens } = setup()
        const token = tokens.signRefreshToken({ userId: 1, sessionVersion: 4, expiresAt: new Date(START + 60_000) })

        const response = await request(app).get("/protegida").set("Cookie", `proconchat_access=${token}`)

        expect(response.status).toBe(401)
        expect(response.body).toEqual(unauthorized)
    })

    it("responde 401 com a session_version antiga", async () => {
        const { app, tokens } = setup()
        const token = tokens.signAccessToken({ userId: 1, sessionVersion: 3 })

        const response = await request(app).get("/protegida").set("Cookie", `proconchat_access=${token}`)

        expect(response.status).toBe(401)
        expect(response.body).toEqual(unauthorized)
    })

    it("responde 401 para a conta inativa", async () => {
        const { app, tokens } = setup()
        const token = tokens.signAccessToken({ userId: 2, sessionVersion: 0 })

        const response = await request(app).get("/protegida").set("Cookie", `proconchat_access=${token}`)

        expect(response.status).toBe(401)
        expect(response.body).toEqual(unauthorized)
    })

    it("responde 401 com so o Authorization Bearer valido, sem cookie", async () => {
        const { app, tokens } = setup()
        const token = tokens.signAccessToken({ userId: 1, sessionVersion: 4 })

        const response = await request(app).get("/protegida").set("Authorization", `Bearer ${token}`)

        expect(response.status).toBe(401)
        expect(response.body).toEqual(unauthorized)
    })

    it("responde 401 com o cabecalho Cookie malformado, sem erro 500", async () => {
        const { app } = setup()

        const response = await request(app).get("/protegida").set("Cookie", "proconchat_access=%E0%A4%A; ;;=")

        expect(response.status).toBe(401)
        expect(response.body).toEqual(unauthorized)
    })
})
