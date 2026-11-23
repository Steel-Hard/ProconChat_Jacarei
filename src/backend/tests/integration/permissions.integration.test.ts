import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import app from "../../app"
import getPool from "../../db/connection"
import { PERMISSIONS } from "../../types/auth.types"
import {
    createAppointmentScope,
    createTestAppointment,
    deleteAppointmentScope,
    OwnedAppointmentScope,
} from "./helpers/appointmentsDb"
import { createTestUser, deleteTestUsers, TestUser } from "./helpers/usersDb"

const ORIGIN = process.env.FRONTEND_ORIGIN as string
const PASSWORD = "senha-das-permissoes"

describe("Permissões reais das contas com Postgres", () => {
    const createdUserIds: (number | null)[] = []
    let admin: TestUser
    let scope: OwnedAppointmentScope

    async function user(input: Parameters<typeof createTestUser>[0]): Promise<TestUser> {
        const created = await createTestUser(input)
        createdUserIds.push(created.createdId)
        return created
    }

    beforeAll(async () => {
        admin = await user({ isAdmin: true })
        scope = await createAppointmentScope(admin.id, "permissions")
    })

    afterAll(async () => {
        await deleteAppointmentScope(scope)
        await deleteTestUsers(createdUserIds)
        await getPool().end()
    })

    it("libera a lista de agendamentos e recusa assumir para quem so ve agendamentos", async () => {
        const viewer = await user({ permissions: ["appointments.view"] })
        const appointmentId = await createTestAppointment(scope, { cpf: "11144477735" })

        const list = await request(app).get("/api/v1/appointments").set("Cookie", viewer.cookie)
        const claim = await request(app)
            .patch(`/api/v1/appointments/${appointmentId}/status`)
            .set("Cookie", viewer.cookie)
            .set("Origin", ORIGIN)
            .send({ action: "claim" })

        expect(list.status).toBe(200)
        expect(claim.status).toBe(403)
        expect(claim.body).toEqual({ error: { code: "FORBIDDEN", message: "Insufficient permission" } })
    })

    it("deixa quem gerencia agendamentos assumir um agendamento pendente", async () => {
        const operator = await user({ permissions: ["appointments.manage", "appointments.view"] })
        const appointmentId = await createTestAppointment(scope, { cpf: "22255588846" })

        const claim = await request(app)
            .patch(`/api/v1/appointments/${appointmentId}/status`)
            .set("Cookie", operator.cookie)
            .set("Origin", ORIGIN)
            .send({ action: "claim" })

        expect(claim.status).toBe(200)
        expect(claim.body.data.status).toBe("CONFIRMED")
        expect(claim.body.data.assigned_user_id).toBe(String(operator.id))
    })

    it("devolve em /auth/me as permissoes gravadas na ordem do catalogo", async () => {
        const staff = await user({ permissions: ["content.manage", "appointments.manage", "appointments.view"] })

        const me = await request(app).get("/api/v1/auth/me").set("Cookie", staff.cookie)

        expect(me.status).toBe(200)
        expect(me.body.data.permissions).toEqual(["appointments.view", "appointments.manage", "content.manage"])
    })

    it("responde 200 em /auth/me com permissions vazio e 403 nas rotas protegidas para conta sem permissoes", async () => {
        const empty = await user({})

        const me = await request(app).get("/api/v1/auth/me").set("Cookie", empty.cookie)
        const list = await request(app).get("/api/v1/appointments").set("Cookie", empty.cookie)
        const pending = await request(app).get("/api/v1/appointments/pending-count").set("Cookie", empty.cookie)
        const settings = await request(app).get("/api/v1/whatsapp/settings").set("Cookie", empty.cookie)

        expect(me.status).toBe(200)
        expect(me.body.data).toEqual({ id: empty.id, name: empty.name, email: empty.email, isAdmin: false, permissions: [] })
        expect([list.status, pending.status, settings.status]).toEqual([403, 403, 403])
    })

    it("da ao Admin as 8 permissoes sem linhas em UserPermissions e guarda ADMIN_ONLY so para ele", async () => {
        const everything = await user({ permissions: [...PERMISSIONS] })
        const adminRows = await getPool().query("SELECT 1 FROM UserPermissions WHERE user_id = $1", [admin.id])

        const adminMe = await request(app).get("/api/v1/auth/me").set("Cookie", admin.cookie)
        const staffSettings = await request(app).get("/api/v1/whatsapp/settings").set("Cookie", everything.cookie)

        expect(adminRows.rowCount).toBe(0)
        expect(adminMe.body.data.permissions).toEqual([...PERMISSIONS])
        expect(adminMe.body.data.isAdmin).toBe(true)
        expect(staffSettings.status).toBe(403)
    })

    it("julga a proxima requisicao com as permissoes novas sem novo login", async () => {
        const viewer = await user({ permissions: ["appointments.view"] })
        const before = await request(app).get("/api/v1/appointments").set("Cookie", viewer.cookie)

        await getPool().query("DELETE FROM UserPermissions WHERE user_id = $1", [viewer.id])
        const after = await request(app).get("/api/v1/appointments").set("Cookie", viewer.cookie)

        expect(before.status).toBe(200)
        expect(after.status).toBe(403)
    })

    it("devolve as permissoes reais na resposta do login", async () => {
        const staff = await user({ permissions: ["reports.view", "sessions.view"], password: PASSWORD })

        const login = await request(app)
            .post("/api/v1/auth/login")
            .set("Origin", ORIGIN)
            .send({ email: staff.email, password: PASSWORD })

        expect(login.status).toBe(200)
        expect(login.body.data.user.permissions).toEqual(["sessions.view", "reports.view"])
    })
})
