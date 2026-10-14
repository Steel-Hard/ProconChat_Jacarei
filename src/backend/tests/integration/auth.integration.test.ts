import bcrypt from "bcryptjs"
import express from "express"
import request from "supertest"
import { afterAll, afterEach, beforeEach, describe, expect, test } from "vitest"
import app from "../../app"
import getPool from "../../db/connection"
import { requireAuth, requirePermission } from "../../middleware/auth.middleware"
import errorHandler from "../../middleware/errorHandler.middleware"

const ORIGIN = process.env.FRONTEND_ORIGIN as string
const initialPassword = "senha-inicial-integracao"
const newPassword = "senha-nova-integracao"

let createdUsers = 0
let userId = 0
let email = ""

async function createUser(): Promise<void> {
    createdUsers += 1
    email = `integracao-auth-${process.pid}-${Date.now()}-${createdUsers}@exemplo.test`
    const passwordHash = await bcrypt.hash(initialPassword, 4)
    const result = await getPool().query<{ id: string }>(
        "INSERT INTO Users (name, email, password_hash) VALUES ('Equipe Integracao', $1, $2) RETURNING id",
        [email, passwordHash],
    )
    userId = Number(result.rows[0]?.id)
}

async function userRow() {
    const result = await getPool().query<{ session_version: number; last_login_at: Date | null; active: boolean }>(
        "SELECT session_version, last_login_at, active FROM Users WHERE id = $1",
        [userId],
    )
    return result.rows[0]
}

function setCookies(response: request.Response): string[] {
    return (response.headers["set-cookie"] as unknown as string[] | undefined) ?? []
}

function cookieHeader(response: request.Response): string {
    return setCookies(response)
        .map((cookie) => cookie.split(";")[0])
        .join("; ")
}

function login(agent: ReturnType<typeof request.agent>, password: string) {
    return agent.post("/api/v1/auth/login").set("Origin", ORIGIN).send({ email: email.toUpperCase(), password })
}

async function loggedInAgent(password = initialPassword) {
    const agent = request.agent(app)
    const response = await login(agent, password)
    expect(response.status).toBe(200)
    return { agent, cookies: cookieHeader(response) }
}

describe("Autenticacao do painel com Postgres", () => {
    beforeEach(async () => {
        await createUser()
    })

    afterEach(async () => {
        await getPool().query("DELETE FROM Users WHERE id = $1", [userId])
    })

    afterAll(async () => {
        await getPool().end()
    })

    test("faz login, grava last_login_at e define os dois cookies sem token no corpo", async () => {
        const response = await login(request.agent(app), initialPassword)

        expect(response.status).toBe(200)
        expect(response.body).toEqual({
            data: { user: { id: userId, name: "Equipe Integracao", email, isAdmin: false, permissions: [] } },
        })
        expect(setCookies(response).map((cookie) => cookie.split("=")[0])).toEqual(["proconchat_access", "proconchat_refresh"])
        expect((await userRow())?.last_login_at).not.toBeNull()
    })

    test("devolve a conta logada em /me pelo cookie de acesso", async () => {
        const { agent } = await loggedInAgent()

        const response = await agent.get("/api/v1/auth/me")

        expect(response.status).toBe(200)
        expect(response.body.data).toMatchObject({ id: userId, email, isAdmin: false, permissions: [] })
    })

    test("renova so o cookie de acesso no refresh", async () => {
        const { agent } = await loggedInAgent()

        const response = await agent.post("/api/v1/auth/refresh").set("Origin", ORIGIN)

        expect(response.status).toBe(204)
        expect(setCookies(response).map((cookie) => cookie.split("=")[0])).toEqual(["proconchat_access"])
    })

    test("troca a senha, invalida as sessoes antigas e mantem a atual", async () => {
        const { cookies: cookiesBeforePasswordChange } = await loggedInAgent()
        const { agent } = await loggedInAgent()
        const versionBefore = (await userRow())?.session_version ?? -1

        const response = await agent
            .post("/api/v1/auth/change-password")
            .set("Origin", ORIGIN)
            .send({ currentPassword: initialPassword, newPassword })

        expect(response.status).toBe(200)
        expect(response.body).toEqual({ data: { changed: true } })
        expect((await userRow())?.session_version).toBe(versionBefore + 1)
        expect((await agent.get("/api/v1/auth/me")).status).toBe(200)
        const oldMe = await request(app).get("/api/v1/auth/me").set("Cookie", cookiesBeforePasswordChange)
        const oldRefresh = await request(app)
            .post("/api/v1/auth/refresh")
            .set("Origin", ORIGIN)
            .set("Cookie", cookiesBeforePasswordChange)
        expect(oldMe.status).toBe(401)
        expect(oldRefresh.status).toBe(401)
        expect((await login(request.agent(app), initialPassword)).status).toBe(401)
        expect((await login(request.agent(app), newPassword)).status).toBe(200)
    })

    test("faz logout limpando os cookies sem mudar a session_version", async () => {
        const { agent } = await loggedInAgent()
        const versionBefore = (await userRow())?.session_version

        const response = await agent.post("/api/v1/auth/logout").set("Origin", ORIGIN)

        expect(response.status).toBe(204)
        expect(setCookies(response).every((cookie) => /^proconchat_(access|refresh)=;/.test(cookie))).toBe(true)
        expect((await userRow())?.session_version).toBe(versionBefore)
        expect((await agent.get("/api/v1/auth/me")).status).toBe(401)
    })

    test("responde 403 numa rota com requirePermission para a conta que nao e Admin", async () => {
        const panel = express()
        panel.get("/painel", requireAuth, requirePermission("users.manage"), (_req, res) => {
            res.status(200).json({ data: { ok: true } })
        })
        panel.use(errorHandler)
        const { cookies: session } = await loggedInAgent()

        const response = await request(panel).get("/painel").set("Cookie", session)

        expect(response.status).toBe(403)
        expect(response.body).toEqual({ error: { code: "FORBIDDEN", message: "Insufficient permission" } })
    })

    test("recusa com 403 INVALID_ORIGIN o POST sem Origin, mesmo com sessao valida", async () => {
        const { cookies: session } = await loggedInAgent()

        const response = await request(app)
            .post("/api/v1/auth/change-password")
            .set("Cookie", session)
            .send({ currentPassword: initialPassword, newPassword })

        expect(response.status).toBe(403)
        expect(response.body.error.code).toBe("INVALID_ORIGIN")
    })

    test("recusa com 401 a conta desativada, inclusive no refresh", async () => {
        const { agent: fresh } = await loggedInAgent()

        await getPool().query("UPDATE Users SET active = FALSE WHERE id = $1", [userId])

        expect((await fresh.get("/api/v1/auth/me")).status).toBe(401)
        expect((await fresh.post("/api/v1/auth/refresh").set("Origin", ORIGIN)).status).toBe(401)
        expect((await login(request.agent(app), initialPassword)).status).toBe(401)
    })
})
