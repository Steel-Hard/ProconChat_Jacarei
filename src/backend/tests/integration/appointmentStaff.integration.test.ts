import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import app from "../../app"
import getPool from "../../db/connection"
import { createTestUser, deleteTestUsers, TestUser } from "./helpers/usersDb"

interface StaffItem {
    id: string
    name: string
    active: boolean
    email: string | null
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
            { id: String(inactiveManager.id), name: inactiveManager.name, active: false, email: null },
            { id: String(activeManager.id), name: activeManager.name, active: true, email: null },
        ])
        expect(staff.find((item) => item.id === String(admin.id))).toEqual({
            id: String(admin.id),
            name: admin.name,
            active: true,
            email: null,
        })
    })

    it("não traz contas só com Ver agendamentos nem contas sem permissões", async () => {
        const staff = await staffOf(viewer)

        const ids = staff.map((item) => item.id)
        expect(ids).not.toContain(String(viewer.id))
        expect(ids).not.toContain(String(withoutPermissions.id))
    })

    it("para quem só tem Ver agendamentos, o e-mail vem nulo em todas as contas", async () => {
        const staff = await staffOf(viewer)

        expect(staff.length).toBeGreaterThan(0)
        for (const item of staff) {
            expect(item.email).toBeNull()
        }
    })

    it("para quem gerencia agendamentos, o e-mail vem só das contas ativas e nulo nas inativas", async () => {
        const staff = await staffOf(activeManager)

        expect(staff.find((item) => item.id === String(activeManager.id))?.email).toBe(activeManager.email)
        expect(staff.find((item) => item.id === String(admin.id))?.email).toBe(admin.email)
        expect(staff.find((item) => item.id === String(inactiveManager.id))?.email).toBeNull()
        for (const item of staff.filter((entry) => !entry.active)) {
            expect(item.email).toBeNull()
        }
    })

    it("para o Admin, o e-mail vem só das contas ativas e nulo nas inativas", async () => {
        const staff = await staffOf(admin)

        expect(staff.find((item) => item.id === String(activeManager.id))?.email).toBe(activeManager.email)
        expect(staff.find((item) => item.id === String(inactiveManager.id))?.email).toBeNull()
    })

    it("cada item da lista só tem active, email, id e name", async () => {
        const staff = await staffOf(admin)

        expect(staff.length).toBeGreaterThan(0)
        for (const item of staff) {
            expect(Object.keys(item).sort()).toEqual(["active", "email", "id", "name"])
        }
    })

    it("recusa com 403 a conta sem Ver agendamentos", async () => {
        const res = await request(app).get("/api/v1/appointments/staff").set("Cookie", withoutPermissions.cookie)

        expect(res.status).toBe(403)
        expect(res.body.error.code).toBe("FORBIDDEN")
    })
})
