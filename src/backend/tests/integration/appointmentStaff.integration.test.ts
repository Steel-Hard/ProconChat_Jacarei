import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import app from "../../app"
import getPool from "../../db/connection"
import { createTestUser, deleteTestUsers, TestUser } from "./helpers/usersDb"

interface StaffItem {
    id: string
    name: string
    active: boolean
}

describe("Lista de funcionários dos agendamentos com Postgres", () => {
    const createdUserIds: (number | null)[] = []
    let admin: TestUser
    let activeManager: TestUser
    let inactiveManager: TestUser
    let viewer: TestUser
    let withoutPermissions: TestUser

    beforeAll(async () => {
        const suffix = `${process.pid}-${Date.now()}`
        admin = await createTestUser({ isAdmin: true })
        activeManager = await createTestUser({
            name: `Bruna Gestora ${suffix}`,
            permissions: ["appointments.view", "appointments.manage"],
        })
        inactiveManager = await createTestUser({
            name: `Aline Inativa ${suffix}`,
            permissions: ["appointments.view", "appointments.manage"],
            active: false,
        })
        viewer = await createTestUser({ name: `Caio Leitor ${suffix}`, permissions: ["appointments.view"] })
        withoutPermissions = await createTestUser({ name: `Davi Sem Acesso ${suffix}` })
        createdUserIds.push(admin.createdId, activeManager.id, inactiveManager.id, viewer.id, withoutPermissions.id)
    })

    afterAll(async () => {
        await deleteTestUsers(createdUserIds)
        await getPool().end()
    })

    async function staffOf(user: TestUser): Promise<StaffItem[]> {
        const res = await request(app).get("/api/v1/appointments/staff").set("Cookie", user.cookie)
        expect(res.status).toBe(200)
        return res.body.data
    }

    it("devolve o Admin e as contas com Gerenciar agendamentos, ativas e inativas, por nome", async () => {
        const staff = await staffOf(viewer)

        const ours = staff.filter((item) => [activeManager.id, inactiveManager.id].map(String).includes(item.id))
        expect(ours).toEqual([
            { id: String(inactiveManager.id), name: inactiveManager.name, active: false },
            { id: String(activeManager.id), name: activeManager.name, active: true },
        ])
        expect(staff.find((item) => item.id === String(admin.id))).toEqual({ id: String(admin.id), name: admin.name, active: true })
    })

    it("não traz contas só com Ver agendamentos nem contas sem permissões", async () => {
        const staff = await staffOf(viewer)

        const ids = staff.map((item) => item.id)
        expect(ids).not.toContain(String(viewer.id))
        expect(ids).not.toContain(String(withoutPermissions.id))
    })

    it("cada item da lista só tem id, name e active", async () => {
        const staff = await staffOf(admin)

        expect(staff.length).toBeGreaterThan(0)
        for (const item of staff) {
            expect(Object.keys(item).sort()).toEqual(["active", "id", "name"])
        }
    })

    it("recusa com 403 a conta sem Ver agendamentos", async () => {
        const res = await request(app).get("/api/v1/appointments/staff").set("Cookie", withoutPermissions.cookie)

        expect(res.status).toBe(403)
        expect(res.body.error.code).toBe("FORBIDDEN")
    })
})
