import express from "express"
import request from "supertest"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createRequireAuth } from "../middleware/auth.middleware"
import errorHandler from "../middleware/errorHandler.middleware"
import { MockAuthRepository } from "../repositories/mock/authMock.repository"
import { buildFutureAppointment, buildUserAccount } from "../repositories/mock/userAccount.builders"
import { UserAccountRepositoryStub } from "../repositories/mock/userAccountStub.repository"
import { createUserAccountService } from "../services/userAccount.service"
import { PERMISSIONS, Permission } from "../types/auth.types"
import type { PasswordHasher } from "../utils/passwordHasher"
import { sessionTokens } from "../utils/sessionToken"
import { UserAccountRoutes } from "./userAccount.routes"

const NOW = new Date("2031-01-10T12:00:00.000Z")
const MANAGE: Permission[] = ["appointments.view", "appointments.manage"]
const ADMIN_ID = 1
const MANAGER_ID = 2
const USER_MANAGER_ID = 3

const authUsers = new MockAuthRepository([
    { id: ADMIN_ID, email: "admin@exemplo.test", passwordHash: "x", name: "Admin", isAdmin: true },
    { id: MANAGER_ID, email: "paula@exemplo.test", passwordHash: "x", name: "Paula", permissions: [...MANAGE, "users.manage"] },
    { id: USER_MANAGER_ID, email: "rui@exemplo.test", passwordHash: "x", name: "Rui", permissions: ["users.manage"] },
])

const hasher: PasswordHasher = { hash: vi.fn(async () => "hash"), compare: vi.fn(async () => false) }

function cookieOf(userId: number): string {
    return `proconchat_access=${sessionTokens.signAccessToken({ userId, sessionVersion: 0 })}`
}

describe("PATCH /api/v1/users (lote)", () => {
    let repository: UserAccountRepositoryStub
    let app: express.Express

    beforeEach(() => {
        repository = new UserAccountRepositoryStub({
            accounts: [
                buildUserAccount(ADMIN_ID, { name: "Admin", isAdmin: true, permissions: [...PERMISSIONS] }),
                buildUserAccount(MANAGER_ID, { name: "Paula", permissions: [...MANAGE, "users.manage"] }),
                buildUserAccount(USER_MANAGER_ID, { name: "Rui", permissions: ["users.manage"] }),
                buildUserAccount(7, { name: "Lucas", permissions: MANAGE }),
                buildUserAccount(8, { name: "Marta", permissions: [] }),
                buildUserAccount(9, { name: "Rita", permissions: ["reports.view"] }),
            ],
            futureAppointments: {
                7: [buildFutureAppointment("70", "2031-02-01T16:00:00.000Z")],
            },
            busy: [
                {
                    appointmentId: "80",
                    protocol: "P0000080",
                    assignedUserId: 2,
                    appointmentDatetime: new Date("2031-02-01T16:20:00.000Z"),
                },
            ],
            slotMinutes: 30,
        })
        const service = createUserAccountService({ repository, hasher, now: () => NOW })
        app = express()
        app.use(express.json())
        app.use(
            "/api/v1/users",
            new UserAccountRoutes({ service, authMiddleware: createRequireAuth({ users: authUsers, tokens: sessionTokens }) }).getRouter(),
        )
        app.use(errorHandler)
    })

    function patch(changes: unknown[], userId = MANAGER_ID) {
        return request(app).patch("/api/v1/users").set("Cookie", cookieOf(userId)).send({ changes })
    }

    it("salva o lote e devolve a lista atualizada com redistributed", async () => {
        const response = await patch([
            { userId: 8, permissions: ["appointments.manage"] },
            { userId: 7, active: false, reassignment: { mode: "assign", toUserId: 8 } },
        ])

        expect(response.status).toBe(200)
        expect(response.headers["cache-control"]).toBe("no-store")
        expect(response.body.data.redistributed).toBe(1)
        expect(response.body.data.lastChange).toEqual({ name: "Paula", at: NOW.toISOString() })
        expect(response.body.data.items.map((item: { id: number; active: boolean; permissions: Permission[] }) => [item.id, item.active, item.permissions])).toEqual([
            [ADMIN_ID, true, [...PERMISSIONS]],
            [MANAGER_ID, true, [...MANAGE, "users.manage"]],
            [USER_MANAGER_ID, true, ["users.manage"]],
            [7, false, MANAGE],
            [8, true, MANAGE],
            [9, true, ["reports.view"]],
        ])
        expect(JSON.stringify(response.body)).not.toMatch(/hash|sessionVersion|password/i)
    })

    it.each([
        [MANAGER_ID, 403, "SELF_ACCOUNT_LOCKED", "A própria conta não pode ser alterada por aqui"],
        [ADMIN_ID, 403, "ADMIN_ACCOUNT_LOCKED", "A conta do Admin não pode ser alterada por aqui"],
        [99, 404, "NOT_FOUND", "Conta não encontrada"],
    ])("recusa o item da conta %s com %s e details.userId", async (userId, status, code, message) => {
        const response = await patch([{ userId, active: false }])

        expect(response.status).toBe(status)
        expect(response.body).toEqual({ error: { code, message, details: { userId } } })
    })

    it("recusa com PERMISSION_NOT_HELD conceder uma permissao que quem pede nao tem", async () => {
        const response = await patch([{ userId: 8, permissions: ["reports.view"] }])

        expect(response.status).toBe(403)
        expect(response.body).toEqual({
            error: {
                code: "PERMISSION_NOT_HELD",
                message: "Você não pode conceder nem remover uma permissão que não tem",
                details: { userId: 8 },
            },
        })
    })

    it("recusa com PERMISSION_NOT_HELD tirar ver e gerenciar de quem tem as duas sem gerenciar agendamentos", async () => {
        const response = await patch([{ userId: 7, permissions: [] }], USER_MANAGER_ID)

        expect(response.status).toBe(403)
        expect(response.body.error).toMatchObject({ code: "PERMISSION_NOT_HELD", details: { userId: 7 } })
    })

    it("recusa com TARGET_HAS_MORE_PERMISSIONS desativar conta com mais permissoes", async () => {
        const response = await patch([{ userId: 9, active: false }])

        expect(response.status).toBe(403)
        expect(response.body).toEqual({
            error: { code: "TARGET_HAS_MORE_PERMISSIONS", message: "A conta tem permissões que você não tem", details: { userId: 9 } },
        })
    })

    it("recusa com REASSIGNMENT_REQUIRED a desativacao de quem tem agendamentos futuros sem reassignment", async () => {
        const response = await patch([{ userId: 7, active: false }])

        expect(response.status).toBe(409)
        expect(response.body).toEqual({
            error: {
                code: "REASSIGNMENT_REQUIRED",
                message: "A conta tem agendamentos futuros que precisam de outro destino",
                details: { userId: 7 },
            },
        })
    })

    it("recusa com INVALID_REASSIGNMENT_TARGET o destino sem appointments.manage", async () => {
        const response = await patch([{ userId: 7, active: false, reassignment: { mode: "assign", toUserId: 8 } }])

        expect(response.status).toBe(409)
        expect(response.body).toEqual({
            error: {
                code: "INVALID_REASSIGNMENT_TARGET",
                message: "O destino dos agendamentos precisa ser outra conta ativa que gerencie agendamentos",
                details: { userId: 7 },
            },
        })
    })

    it("recusa com REASSIGNMENT_TARGET_BUSY o destino ocupado num horario sobreposto", async () => {
        const response = await patch([{ userId: 7, active: false, reassignment: { mode: "assign", toUserId: MANAGER_ID } }])

        expect(response.status).toBe(409)
        expect(response.body).toEqual({
            error: {
                code: "REASSIGNMENT_TARGET_BUSY",
                message: "O destino já tem um agendamento nesse horário",
                details: { userId: 7, toUserId: MANAGER_ID, protocol: "P0000070", conflictingProtocol: "P0000080" },
            },
        })
    })

    it("responde 400 para lote vazio ou com userId repetido", async () => {
        const empty = await patch([])
        const repeated = await patch([
            { userId: 7, active: true },
            { userId: 7, permissions: [] },
        ])

        expect([empty.status, repeated.status]).toEqual([400, 400])
        expect(repository.batchCalls).toEqual([])
    })

    it("nao grava nada do lote quando uma conta falha", async () => {
        const before = (await request(app).get("/api/v1/users").set("Cookie", cookieOf(MANAGER_ID))).body

        const response = await patch([
            { userId: 8, permissions: ["appointments.view"] },
            { userId: 9, active: false },
        ])
        const after = (await request(app).get("/api/v1/users").set("Cookie", cookieOf(MANAGER_ID))).body

        expect(response.status).toBe(403)
        expect(after).toEqual(before)
    })
})
