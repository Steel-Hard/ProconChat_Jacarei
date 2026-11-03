import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest"
import app from "../../app"
import getPool from "../../db/connection"
import { createTestUser, deleteTestUsers, TestUser } from "./helpers/usersDb"

const ORIGIN = process.env.FRONTEND_ORIGIN as string
const PATH = "/api/v1/whatsapp/settings/privacy"

let originalRow: Record<string, unknown> | undefined
let admin: TestUser

async function restoreRow(): Promise<void> {
    await getPool().query("DELETE FROM PrivacySettings")
    if (!originalRow) {
        return
    }
    const columns = Object.keys(originalRow)
    const placeholders = columns.map((_column, index) => `$${index + 1}`)
    await getPool().query(
        `INSERT INTO PrivacySettings (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`,
        columns.map((column) => originalRow?.[column]),
    )
}

function save(body: Record<string, unknown>) {
    return request(app).put(PATH).set("Origin", ORIGIN).set("Cookie", admin.cookie).send(body)
}

describe("configuracao de privacidade com Postgres", () => {
    beforeAll(async () => {
        const existing = await getPool().query<Record<string, unknown>>("SELECT * FROM PrivacySettings WHERE id = 1")
        originalRow = existing.rows[0]
        admin = await createTestUser({ isAdmin: true })
    })

    beforeEach(async () => {
        await getPool().query("DELETE FROM PrivacySettings")
    })

    afterAll(async () => {
        try {
            await restoreRow()
            await deleteTestUsers([admin.createdId])
        } finally {
            await getPool().end()
        }
    })

    test("PUT grava os valores aparados com o Admin e a data, e o GET seguinte devolve o mesmo", async () => {
        const before = Date.now()

        const saved = await save({
            controllerName: "  Prefeitura de Jacareí  ",
            dpoName: "Maria Encarregada",
            contactEmail: " privacidade@exemplo.test ",
            inPersonContact: "   ",
            retentionText: "Sessões por 12 meses.",
            retentionEnabled: true,
            sessionRetentionDays: 30,
            appointmentRetentionDays: 1825,
        })

        expect(saved.status).toBe(200)
        expect(saved.body.data).toEqual({
            controllerName: "Prefeitura de Jacareí",
            dpoName: "Maria Encarregada",
            contactEmail: "privacidade@exemplo.test",
            inPersonContact: null,
            retentionText: "Sessões por 12 meses.",
            retentionEnabled: true,
            sessionRetentionDays: 30,
            appointmentRetentionDays: 1825,
            updatedBy: { id: admin.id, name: admin.name },
            updatedAt: expect.any(String),
        })
        expect(Date.parse(saved.body.data.updatedAt)).toBeGreaterThanOrEqual(before - 1000)
        const read = await request(app).get(PATH).set("Origin", ORIGIN).set("Cookie", admin.cookie)
        expect(read.status).toBe(200)
        expect(read.body).toEqual(saved.body)
    })

    test("dois salvamentos seguidos deixam uma linha so, id 1, com os valores do ultimo", async () => {
        const base = {
            controllerName: "Primeiro",
            dpoName: null,
            contactEmail: null,
            inPersonContact: null,
            retentionText: null,
            retentionEnabled: false,
            sessionRetentionDays: 90,
            appointmentRetentionDays: 365,
        }
        await save(base)

        const second = await save({ ...base, controllerName: "Segundo", contactEmail: "segundo@exemplo.test" })

        expect(second.status).toBe(200)
        const rows = await getPool().query<{ id: number; controller_name: string; contact_email: string }>(
            "SELECT id, controller_name, contact_email FROM PrivacySettings",
        )
        expect(rows.rows).toEqual([{ id: 1, controller_name: "Segundo", contact_email: "segundo@exemplo.test" }])
    })

    test("GET publico devolve os valores gravados sem quem alterou nem quando", async () => {
        const body = {
            controllerName: "Prefeitura de Jacareí",
            dpoName: "Maria Encarregada",
            contactEmail: "privacidade@exemplo.test",
            inPersonContact: "Rua Exemplo, 100",
            retentionText: "Sessões por 12 meses.",
            retentionEnabled: true,
            sessionRetentionDays: 120,
            appointmentRetentionDays: 400,
        }
        await save(body)

        const response = await request(app).get("/api/v1/privacy")

        expect(response.status).toBe(200)
        expect(response.body).toEqual({ data: body })
    })
})
