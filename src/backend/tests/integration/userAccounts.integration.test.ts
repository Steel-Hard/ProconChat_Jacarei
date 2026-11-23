import { randomBytes } from "node:crypto"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import app from "../../app"
import getPool from "../../db/connection"
import type { Permission } from "../../types/auth.types"
import {
    createAppointmentScope,
    createTestAppointment,
    deleteAppointmentScope,
    OwnedAppointmentScope,
} from "./helpers/appointmentsDb"
import { restoreScheduleConfig, ScheduleConfigSnapshot, snapshotScheduleConfig, useScheduleConfig } from "./helpers/scheduleDb"
import { accessCookie, createTestUser, deleteTestUsers, TestUser } from "./helpers/usersDb"

const ORIGIN = process.env.FRONTEND_ORIGIN as string
const MANAGE: Permission[] = ["appointments.view", "appointments.manage"]
const PASSWORD = "senha-inicial-contas"

interface EventBody {
    type: string
    actor_user_id: string | null
    data: Record<string, unknown>
}

describe("Contas e permissões pela API com Postgres", () => {
    const createdUserIds: (number | null)[] = []
    let admin: TestUser
    let manager: TestUser
    let scope: OwnedAppointmentScope
    let scheduleSnapshot: ScheduleConfigSnapshot
    let day = 0

    async function user(input: Parameters<typeof createTestUser>[0]): Promise<TestUser> {
        const created = await createTestUser(input)
        createdUserIds.push(created.createdId)
        return created
    }

    async function confirmed(owner: TestUser, at?: Date): Promise<number> {
        day += 1
        return createTestAppointment(scope, {
            status: "CONFIRMED",
            assignedUserId: owner.id,
            appointmentDatetime: at ?? new Date(Date.UTC(2031, 7, day, 16)),
            cpfHash: randomBytes(32).toString("hex"),
        })
    }

    function patchUsers(cookie: string, changes: unknown[]) {
        return request(app).patch("/api/v1/users").set("Cookie", cookie).set("Origin", ORIGIN).send({ changes })
    }

    function resetPassword(cookie: string, userId: number, password: string) {
        return request(app)
            .post(`/api/v1/users/${userId}/reset-password`)
            .set("Cookie", cookie)
            .set("Origin", ORIGIN)
            .send({ password })
    }

    function login(email: string, password: string) {
        return request(app).post("/api/v1/auth/login").set("Origin", ORIGIN).send({ email, password })
    }

    async function eventsOf(appointmentId: number): Promise<EventBody[]> {
        const detail = await request(app).get(`/api/v1/appointments/${appointmentId}`).set("Cookie", admin.cookie)
        expect(detail.status).toBe(200)
        return detail.body.data.events
    }

    beforeAll(async () => {
        admin = await user({ isAdmin: true })
        manager = await user({ name: "Gerente Contas", permissions: [...MANAGE, "users.manage"] })
        scope = await createAppointmentScope(admin.id, "accounts_api")
        scheduleSnapshot = await snapshotScheduleConfig()
        await useScheduleConfig({
            settings: {
                slot_minutes: 30,
                seats_per_slot: 2,
                window_days: 30,
                min_notice_days: 1,
                wait_alert_days: 7,
                unit_address: "Rua Teste, 1",
                unit_address_complement: null,
                reminder_enabled: false,
                reminder_hours: 24,
            },
            ranges: [],
        })
    })

    afterAll(async () => {
        await restoreScheduleConfig(scheduleSnapshot)
        await deleteAppointmentScope(scope)
        await deleteTestUsers(createdUserIds)
        await getPool().end()
    })

    it("cria a conta com o e-mail em minusculas e recusa o mesmo e-mail com outras maiusculas", async () => {
        const email = `Nova.Conta-${process.pid}-${Date.now()}@Teste.Local`

        const created = await request(app)
            .post("/api/v1/users")
            .set("Cookie", admin.cookie)
            .set("Origin", ORIGIN)
            .send({ name: "Nova Conta", email: ` ${email} `, password: PASSWORD, isAdmin: true, permissions: ["users.manage"] })
        createdUserIds.push(created.body.data?.id ?? null)
        const repeated = await request(app)
            .post("/api/v1/users")
            .set("Cookie", admin.cookie)
            .set("Origin", ORIGIN)
            .send({ name: "Repetida", email: email.toUpperCase(), password: PASSWORD })

        expect(created.status).toBe(201)
        expect(created.body.data).toMatchObject({ email: email.toLowerCase(), isAdmin: false, active: true, permissions: [] })
        expect(repeated.status).toBe(409)
        expect(repeated.body.error.code).toBe("EMAIL_ALREADY_IN_USE")
    })

    it("libera so a lista de agendamentos para a conta que so ve agendamentos", async () => {
        const staff = await user({})
        const appointment = await createTestAppointment(scope, { cpfHash: randomBytes(32).toString("hex") })

        const saved = await patchUsers(admin.cookie, [{ userId: staff.id, permissions: ["appointments.view"] }])
        const list = await request(app).get("/api/v1/appointments").set("Cookie", staff.cookie)
        const claim = await request(app)
            .patch(`/api/v1/appointments/${appointment}/status`)
            .set("Cookie", staff.cookie)
            .set("Origin", ORIGIN)
            .send({ action: "claim" })

        expect(saved.status).toBe(200)
        expect(list.status).toBe(200)
        expect(claim.status).toBe(403)
    })

    it("devolve em /auth/me as permissoes de quem gerencia agendamentos e conteudo", async () => {
        const staff = await user({})

        await patchUsers(admin.cookie, [{ userId: staff.id, permissions: ["content.manage", "appointments.manage"] }])
        const me = await request(app).get("/api/v1/auth/me").set("Cookie", staff.cookie)

        expect(me.body.data.permissions).toEqual(["appointments.view", "appointments.manage", "content.manage"])
    })

    it("recusa alterar a propria conta e a do Admin pela API", async () => {
        const self = await patchUsers(manager.cookie, [{ userId: manager.id, permissions: MANAGE }])
        const adminItem = await patchUsers(manager.cookie, [{ userId: admin.id, active: false }])
        const adminReset = await resetPassword(manager.cookie, admin.id, "senha-nova-admin")

        expect(self.status).toBe(403)
        expect(self.body.error).toMatchObject({ code: "SELF_ACCOUNT_LOCKED", details: { userId: manager.id } })
        expect(adminItem.body.error).toMatchObject({ code: "ADMIN_ACCOUNT_LOCKED", details: { userId: admin.id } })
        expect(adminReset.body.error.code).toBe("ADMIN_ACCOUNT_LOCKED")
    })

    it("recusa conceder permissao que quem pede nao tem e redefinir a senha de conta com mais permissoes", async () => {
        const staff = await user({})
        const stronger = await user({ permissions: ["reports.view"] })

        const grant = await patchUsers(manager.cookie, [{ userId: staff.id, permissions: ["reports.view"] }])
        const reset = await resetPassword(manager.cookie, stronger.id, "senha-nova-conta")

        expect(grant.status).toBe(403)
        expect(grant.body.error).toMatchObject({ code: "PERMISSION_NOT_HELD", details: { userId: staff.id } })
        expect(reset.status).toBe(403)
        expect(reset.body.error.code).toBe("TARGET_HAS_MORE_PERMISSIONS")
    })

    it("mantem GET /api/v1/users igual quando uma conta do lote falha", async () => {
        const first = await user({})
        const failing = await user({ permissions: ["reports.view"] })
        const before = await request(app).get("/api/v1/users").set("Cookie", manager.cookie)

        const response = await patchUsers(manager.cookie, [
            { userId: first.id, permissions: ["appointments.view"] },
            { userId: failing.id, active: false },
        ])
        const after = await request(app).get("/api/v1/users").set("Cookie", manager.cookie)

        expect(response.status).toBe(403)
        expect(response.body.error).toMatchObject({ code: "TARGET_HAS_MORE_PERMISSIONS", details: { userId: failing.id } })
        expect(after.body).toEqual(before.body)
    })

    it("grava a redistribuicao no historico de cada agendamento", async () => {
        const leaving = await user({ permissions: MANAGE })
        const losing = await user({ permissions: MANAGE })
        const destination = await user({ permissions: MANAGE })
        const assigned = await confirmed(leaving)
        const pending = await confirmed(losing)

        const response = await patchUsers(manager.cookie, [
            { userId: leaving.id, active: false, reassignment: { mode: "assign", toUserId: destination.id } },
            { userId: losing.id, permissions: ["appointments.view"], reassignment: { mode: "pending" } },
        ])

        expect(response.status).toBe(200)
        expect(response.body.data.redistributed).toBe(2)
        expect((await eventsOf(assigned))[0]).toMatchObject({
            type: "ASSIGNED",
            actor_user_id: String(manager.id),
            data: { assignee_user_id: destination.id, reason: "USER_DEACTIVATED" },
        })
        expect((await eventsOf(pending))[0]).toMatchObject({
            type: "BACK_TO_PENDING",
            actor_user_id: String(manager.id),
            data: { reason: "MANAGE_PERMISSION_REMOVED" },
        })
    })

    it("recusa o destino ocupado num horario sobreposto com os dois protocolos", async () => {
        const leaving = await user({ permissions: MANAGE })
        const destination = await user({ permissions: MANAGE })
        const at = new Date(Date.UTC(2031, 8, 3, 16))
        await confirmed(leaving, at)
        await confirmed(destination, new Date(at.getTime() + 20 * 60_000))
        const future = await request(app).get(`/api/v1/users/${leaving.id}/future-appointments`).set("Cookie", manager.cookie)
        const busy = await request(app).get(`/api/v1/users/${destination.id}/future-appointments`).set("Cookie", manager.cookie)

        const response = await patchUsers(manager.cookie, [
            { userId: leaving.id, active: false, reassignment: { mode: "assign", toUserId: destination.id } },
        ])

        expect(response.status).toBe(409)
        expect(response.body.error).toEqual({
            code: "REASSIGNMENT_TARGET_BUSY",
            message: "O destino já tem um agendamento nesse horário",
            details: {
                userId: leaving.id,
                toUserId: destination.id,
                protocol: future.body.data[0].protocol,
                conflictingProtocol: busy.body.data[0].protocol,
            },
        })
    })

    it("recusa o token antigo depois de desativar e reativar e recusa o login da conta desativada", async () => {
        const staff = await user({ permissions: ["appointments.view"], password: PASSWORD })
        const oldCookie = accessCookie(staff.id, 0)

        await patchUsers(manager.cookie, [{ userId: staff.id, active: false }])
        const inactiveLogin = await login(staff.email, PASSWORD)
        await patchUsers(manager.cookie, [{ userId: staff.id, active: true }])
        const withOldToken = await request(app).get("/api/v1/auth/me").set("Cookie", oldCookie)
        const newLogin = await login(staff.email, PASSWORD)

        expect(inactiveLogin.status).toBe(401)
        expect(withOldToken.status).toBe(401)
        expect(newLogin.status).toBe(200)
    })

    it("redefine a senha derrubando as sessoes e invalidando a senha anterior", async () => {
        const staff = await user({ permissions: ["appointments.view"], password: PASSWORD })
        const newPassword = "senha-redefinida-contas"

        const reset = await resetPassword(manager.cookie, staff.id, newPassword)
        const oldSession = await request(app).get("/api/v1/auth/me").set("Cookie", staff.cookie)
        const oldPassword = await login(staff.email, PASSWORD)
        const updatedPassword = await login(staff.email, newPassword)

        expect(reset.body).toEqual({ data: { reset: true } })
        expect(oldSession.status).toBe(401)
        expect(oldPassword.status).toBe(401)
        expect(updatedPassword.status).toBe(200)
    }, 30_000)

    it("recusa com INVALID_ORIGIN o lote com Origin forjado e 403 FORBIDDEN quem nao gerencia usuarios", async () => {
        const viewer = await user({ permissions: ["appointments.view"] })

        const forged = await request(app)
            .patch("/api/v1/users")
            .set("Cookie", manager.cookie)
            .set("Origin", "https://atacante.example")
            .send({ changes: [{ userId: viewer.id, active: false }] })
        const forbidden = await request(app).get("/api/v1/users").set("Cookie", viewer.cookie)

        expect(forged.status).toBe(403)
        expect(forged.body.error.code).toBe("INVALID_ORIGIN")
        expect(forbidden.status).toBe(403)
        expect(forbidden.body.error.code).toBe("FORBIDDEN")
    })
})
