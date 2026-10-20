import express from "express"
import request from "supertest"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createRequireAuth } from "../middleware/auth.middleware"
import errorHandler from "../middleware/errorHandler.middleware"
import { MockAuthRepository } from "../repositories/mock/authMock.repository"
import { buildFutureAppointment, buildUserAccount } from "../repositories/mock/userAccount.builders"
import { UserAccountRepositoryStub } from "../repositories/mock/userAccountStub.repository"
import { createUserAccountService } from "../services/userAccount.service"
import { PERMISSIONS } from "../types/auth.types"
import type { PasswordHasher } from "../utils/passwordHasher"
import { sessionTokens } from "../utils/sessionToken"
import { UserAccountRoutes } from "./userAccount.routes"

const NOW = new Date("2031-01-10T12:00:00.000Z")
const ADMIN_ID = 1
const MANAGER_ID = 2
const VIEWER_ID = 3

const authUsers = new MockAuthRepository([
    { id: ADMIN_ID, email: "admin@exemplo.test", passwordHash: "x", name: "Admin", isAdmin: true },
    {
        id: MANAGER_ID,
        email: "paula@exemplo.test",
        passwordHash: "x",
        name: "Paula Siqueira",
        permissions: ["appointments.view", "appointments.manage", "users.manage"],
    },
    { id: VIEWER_ID, email: "lucas@exemplo.test", passwordHash: "x", name: "Lucas", permissions: ["appointments.view"] },
])

const hasher: PasswordHasher = {
    hash: vi.fn(async (password: string) => `hash(${password})`),
    compare: vi.fn(async () => false),
}

function cookieOf(userId: number): string {
    return `proconchat_access=${sessionTokens.signAccessToken({ userId, sessionVersion: 0 })}`
}

const accounts = () => [
    buildUserAccount(ADMIN_ID, { name: "Admin", isAdmin: true, permissions: [...PERMISSIONS] }),
    buildUserAccount(MANAGER_ID, { name: "Paula Siqueira", permissions: ["appointments.view", "appointments.manage", "users.manage"] }),
    buildUserAccount(VIEWER_ID, { name: "Lucas", permissions: ["appointments.view"] }),
    buildUserAccount(4, { name: "Rita", permissions: ["reports.view"] }),
]

describe("userAccount.routes (HTTP)", () => {
    let repository: UserAccountRepositoryStub
    let app: express.Express

    beforeEach(() => {
        repository = new UserAccountRepositoryStub({
            accounts: accounts(),
            futureAppointments: { [VIEWER_ID]: [buildFutureAppointment("50", "2031-02-01T13:00:00.000Z")] },
            takenEmails: ["lucas@exemplo.test"],
        })
        const service = createUserAccountService({ repository, hasher, now: () => NOW })
        const authMiddleware = createRequireAuth({ users: authUsers, tokens: sessionTokens })
        app = express()
        app.use(express.json())
        app.use("/api/v1/users", new UserAccountRoutes({ service, authMiddleware }).getRouter())
        app.use(errorHandler)
    })

    const routes = [
        ["get", "/api/v1/users"],
        ["post", "/api/v1/users"],
        ["patch", "/api/v1/users"],
        ["get", "/api/v1/users/3/future-appointments"],
        ["post", "/api/v1/users/3/reset-password"],
    ] as const

    it.each(routes)("responde 401 em %s %s sem cookie", async (method, path) => {
        const response = await request(app)[method](path)

        expect(response.status).toBe(401)
        expect(response.body.error.code).toBe("UNAUTHORIZED")
    })

    it.each(routes)("responde 403 FORBIDDEN em %s %s sem users.manage", async (method, path) => {
        const response = await request(app)[method](path).set("Cookie", cookieOf(VIEWER_ID)).send({})

        expect(response.status).toBe(403)
        expect(response.body).toEqual({ error: { code: "FORBIDDEN", message: "Insufficient permission" } })
    })

    it("lista as contas com Cache-Control no-store", async () => {
        const response = await request(app).get("/api/v1/users").set("Cookie", cookieOf(MANAGER_ID))

        expect(response.status).toBe(200)
        expect(response.headers["cache-control"]).toBe("no-store")
        expect(response.body).toEqual({ data: { items: accounts(), lastChange: null } })
    })

    it("cria a conta e responde 201 sem senha nem hash", async () => {
        const response = await request(app)
            .post("/api/v1/users")
            .set("Cookie", cookieOf(MANAGER_ID))
            .send({ name: " Nova Pessoa ", email: " Nova@Exemplo.test ", password: "senha-segura", isAdmin: true, permissions: ["users.manage"] })

        expect(response.status).toBe(201)
        expect(response.body).toEqual({
            data: {
                id: 5,
                name: "Nova Pessoa",
                email: "nova@exemplo.test",
                isAdmin: false,
                active: true,
                permissions: [],
                lastLoginAt: null,
                permissionsUpdatedAt: null,
                permissionsUpdatedBy: null,
            },
        })
        expect(JSON.stringify(response.body)).not.toMatch(/senha-segura|hash|sessionVersion|password/i)
    })

    it("responde 409 EMAIL_ALREADY_IN_USE ao criar com e-mail ja usado", async () => {
        const response = await request(app)
            .post("/api/v1/users")
            .set("Cookie", cookieOf(MANAGER_ID))
            .send({ name: "Outro Lucas", email: "LUCAS@exemplo.test", password: "senha-segura" })

        expect(response.status).toBe(409)
        expect(response.body).toEqual({ error: { code: "EMAIL_ALREADY_IN_USE", message: "Este e-mail já está em uso" } })
    })

    it("responde 400 com a mensagem da politica de senha", async () => {
        const response = await request(app)
            .post("/api/v1/users")
            .set("Cookie", cookieOf(MANAGER_ID))
            .send({ name: "Pessoa", email: "p@exemplo.test", password: "curta" })

        expect(response.status).toBe(400)
        expect(response.body).toEqual({
            error: { code: "BAD_REQUEST", message: "Password must contain at least 8 characters" },
        })
    })

    it("responde 400 de validacao para e-mail invalido", async () => {
        const response = await request(app)
            .post("/api/v1/users")
            .set("Cookie", cookieOf(MANAGER_ID))
            .send({ name: "Pessoa", email: "sem-arroba", password: "senha-segura" })

        expect(response.status).toBe(400)
        expect(response.body.error.code).toBe("BAD_REQUEST")
        expect(repository.createCalls).toEqual([])
    })

    it("lista os agendamentos futuros da conta", async () => {
        const response = await request(app).get("/api/v1/users/3/future-appointments").set("Cookie", cookieOf(MANAGER_ID))

        expect(response.status).toBe(200)
        expect(response.body).toEqual({ data: [buildFutureAppointment("50", "2031-02-01T13:00:00.000Z")] })
    })

    it("responde 404 nos agendamentos futuros de conta inexistente e 400 com id invalido", async () => {
        const missing = await request(app).get("/api/v1/users/99/future-appointments").set("Cookie", cookieOf(MANAGER_ID))
        const invalid = await request(app).get("/api/v1/users/abc/future-appointments").set("Cookie", cookieOf(MANAGER_ID))

        expect(missing.status).toBe(404)
        expect(missing.body).toEqual({ error: { code: "NOT_FOUND", message: "Conta não encontrada" } })
        expect(invalid.status).toBe(400)
    })

    it("redefine a senha de outra conta", async () => {
        const response = await request(app)
            .post("/api/v1/users/3/reset-password")
            .set("Cookie", cookieOf(MANAGER_ID))
            .send({ password: "nova-senha-segura" })

        expect(response.status).toBe(200)
        expect(response.body).toEqual({ data: { reset: true } })
        expect(repository.resetCalls).toEqual([
            {
                requester: { id: MANAGER_ID, isAdmin: false, permissions: ["appointments.view", "appointments.manage", "users.manage"] },
                userId: VIEWER_ID,
                passwordHash: "hash(nova-senha-segura)",
            },
        ])
    })

    it.each([
        [ADMIN_ID, "ADMIN_ACCOUNT_LOCKED", "A conta do Admin não pode ser alterada por aqui"],
        [MANAGER_ID, "SELF_ACCOUNT_LOCKED", "A própria conta não pode ser alterada por aqui"],
        [4, "TARGET_HAS_MORE_PERMISSIONS", "A conta tem permissões que você não tem"],
    ])("recusa redefinir a senha da conta %s com %s", async (userId, code, message) => {
        const response = await request(app)
            .post(`/api/v1/users/${userId}/reset-password`)
            .set("Cookie", cookieOf(MANAGER_ID))
            .send({ password: "nova-senha-segura" })

        expect(response.status).toBe(403)
        expect(response.body).toEqual({ error: { code, message } })
    })

    it("responde 404 ao redefinir a senha de conta inexistente", async () => {
        const response = await request(app)
            .post("/api/v1/users/99/reset-password")
            .set("Cookie", cookieOf(MANAGER_ID))
            .send({ password: "nova-senha-segura" })

        expect(response.status).toBe(404)
        expect(response.body).toEqual({ error: { code: "NOT_FOUND", message: "Conta não encontrada" } })
    })
})
