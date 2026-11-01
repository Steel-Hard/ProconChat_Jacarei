import request from "supertest"
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest"
import app from "../../app"
import getPool from "../../db/connection"
import { createAppointmentRepository } from "../../repositories/appointment.repository"
import { hashProviderMessageId } from "../../utils/providerMessageHash"
import { createAppointmentScope, createTestAppointment, deleteAppointmentScope, OwnedAppointmentScope } from "./helpers/appointmentsDb"
import { createTestUser, deleteTestUsers, TestUser } from "./helpers/usersDb"

const PATH = "/api/v1/internal/whatsapp/events"
const NOW = new Date("2031-06-01T12:00:00.000Z")
const PHONE = "5512999990000"
const PREFIX = `wamid.route88.${process.pid}.${Date.now()}`
let sequence = 0
const createdWamids: string[] = []
let staff: TestUser
let scope: OwnedAppointmentScope
let originalSettings: Record<string, unknown> | undefined

function wamid(): string {
    sequence += 1
    const id = `${PREFIX}.${sequence}`
    createdWamids.push(id)
    return id
}

function realisticWamid(): string {
    sequence += 1
    const id = `wamid.HBgNNTUxMjk5OTk5MDAwMBUCABIYFjNFQjBDMDlFQjE5${process.pid}${sequence}`
    createdWamids.push(id)
    return id
}

async function postEvents(statuses: unknown[]) {
    return request(app)
        .post(PATH)
        .set("X-Internal-Token", process.env.GATEWAY_INTERNAL_TOKEN as string)
        .send({ statuses })
}

async function restoreSettings(): Promise<void> {
    await getPool().query("DELETE FROM WhatsAppSettings")
    if (!originalSettings) {
        return
    }
    const columns = Object.keys(originalSettings)
    await getPool().query(
        `INSERT INTO WhatsAppSettings (${columns.join(", ")}) VALUES (${columns.map((_column, index) => `$${index + 1}`).join(", ")})`,
        columns.map((column) => originalSettings?.[column]),
    )
}

async function insertSettings(lastWebhookEventAt: Date | null, updatedAt: Date): Promise<void> {
    await getPool().query("DELETE FROM WhatsAppSettings")
    await getPool().query(
        "INSERT INTO WhatsAppSettings (id, verify_token, updated_by, updated_at, last_webhook_event_at) VALUES (1, $1, $2, $3, $4)",
        ["c".repeat(64), staff.id, updatedAt, lastWebhookEventAt],
    )
}

async function rowsOf(providerMessageId: string) {
    const result = await getPool().query<{ id: string; kind: string; status: string; error_code: string | null; status_at: Date }>(
        "SELECT id, kind, status, error_code, status_at FROM OutboundMessages WHERE provider_message_hash = $1",
        [hashProviderMessageId(providerMessageId)],
    )
    return result.rows
}

describe("Rota interna de eventos do webhook com Postgres", () => {
    beforeAll(async () => {
        originalSettings = (await getPool().query<Record<string, unknown>>("SELECT * FROM WhatsAppSettings WHERE id = 1")).rows[0]
        staff = await createTestUser()
        scope = await createAppointmentScope(staff.id, "it88_route")
    })

    afterEach(async () => {
        await getPool().query("DELETE FROM OutboundMessages WHERE provider_message_hash = ANY($1::text[])", [
            createdWamids.map(hashProviderMessageId),
        ])
    })

    afterAll(async () => {
        try {
            await getPool().query("DELETE FROM OutboundMessages WHERE appointment_id = ANY($1::bigint[])", [scope.createdAppointmentIds])
            await deleteAppointmentScope(scope)
            await restoreSettings()
            await deleteTestUsers([staff.createdId])
        } finally {
            await getPool().end()
        }
    })

    test("sem a linha de configuracao responde 204, grava o failed e nao cria a linha de WhatsAppSettings", async () => {
        await getPool().query("DELETE FROM WhatsAppSettings")
        const id = wamid()

        const response = await postEvents([{ providerMessageId: id, status: "failed", timestamp: 1780000000, errorCode: "131047" }])

        expect(response.status).toBe(204)
        expect((await getPool().query("SELECT 1 FROM WhatsAppSettings")).rows).toEqual([])
        expect(await rowsOf(id)).toEqual([
            {
                id: expect.any(String),
                kind: "REPLY",
                status: "FAILED",
                error_code: "131047",
                status_at: new Date(1780000000 * 1000),
            },
        ])
    })

    test("wamid real em base64 so e gravado como HMAC e um segundo failed do mesmo wamid acha a mesma linha", async () => {
        const id = realisticWamid()
        const decoded = Buffer.from(id.slice("wamid.".length), "base64").toString("latin1")
        expect(decoded).toContain(PHONE)

        await postEvents([{ providerMessageId: id, status: "failed", timestamp: 1780000000, errorCode: "131047" }])
        const first = await rowsOf(id)
        await postEvents([{ providerMessageId: id, status: "failed", timestamp: 1780000100, errorCode: "131026" }])
        const second = await rowsOf(id)

        const stored = JSON.stringify((await getPool().query("SELECT * FROM OutboundMessages WHERE provider_message_hash = $1", [hashProviderMessageId(id)])).rows)
        expect(stored).toContain(hashProviderMessageId(id))
        for (const leaked of [id, id.slice("wamid.".length), PHONE, "NTUxMjk5OTk5MDAw"]) {
            expect(stored).not.toContain(leaked)
        }
        expect(first).toHaveLength(1)
        expect(second).toEqual(first)
    })

    test("delivered de um wamid real em base64 ja gravado como enviado acha a mesma linha pelo HMAC", async () => {
        const appointmentId = await createTestAppointment(scope, { status: "CANCELED", assignedUserId: staff.id })
        const id = realisticWamid()
        await createAppointmentRepository().recordCitizenNotification(String(appointmentId), "NOTIFIED", "CANCELLATION", staff.id, NOW, id)
        const before = await rowsOf(id)

        const response = await postEvents([{ providerMessageId: id, status: "delivered", timestamp: 1780000000, errorCode: null }])

        const after = await rowsOf(id)
        expect(response.status).toBe(204)
        expect(before.map((row) => row.status)).toEqual(["SENT"])
        expect(after.map((row) => ({ id: row.id, kind: row.kind, status: row.status }))).toEqual([
            { id: before[0]?.id, kind: "CANCELLATION", status: "DELIVERED" },
        ])
    })

    test("lote com item de codigo e data zerados pelo gateway responde 204, grava os dois e atualiza o ultimo evento", async () => {
        const previousEvent = new Date("2020-01-01T00:00:00.000Z")
        const updatedAt = new Date("2020-01-02T00:00:00.000Z")
        await insertSettings(previousEvent, updatedAt)
        const valid = wamid()
        const sanitized = wamid()

        const response = await postEvents([
            { providerMessageId: valid, status: "failed", timestamp: 1780000000, errorCode: "131047" },
            { providerMessageId: sanitized, status: "failed", timestamp: null, errorCode: null },
        ])

        expect(response.status).toBe(204)
        expect((await rowsOf(valid))[0]).toMatchObject({ status: "FAILED", error_code: "131047", status_at: new Date(1780000000 * 1000) })
        expect((await rowsOf(sanitized))[0]).toMatchObject({ status: "FAILED", error_code: null })
        const settings = await getPool().query<{ last_webhook_event_at: Date; updated_at: Date; updated_by: string }>(
            "SELECT last_webhook_event_at, updated_at, updated_by FROM WhatsAppSettings WHERE id = 1",
        )
        expect(settings.rows[0]?.last_webhook_event_at.getTime()).toBeGreaterThan(previousEvent.getTime())
        expect(settings.rows[0]?.updated_at).toEqual(updatedAt)
        expect(settings.rows[0]?.updated_by).toBe(String(staff.id))
    })

    test("lote com errorCode de 41 caracteres responde 400 sem gravar nada e sem mudar o ultimo evento", async () => {
        const previousEvent = new Date("2020-01-01T00:00:00.000Z")
        await insertSettings(previousEvent, new Date("2020-01-02T00:00:00.000Z"))
        const valid = wamid()
        const invalid = wamid()

        const response = await postEvents([
            { providerMessageId: valid, status: "failed", timestamp: 1780000000, errorCode: "131047" },
            { providerMessageId: invalid, status: "failed", timestamp: 253402300800, errorCode: "9".repeat(41) },
        ])

        expect(response.status).toBe(400)
        expect(await rowsOf(valid)).toEqual([])
        expect(await rowsOf(invalid)).toEqual([])
        const settings = await getPool().query<{ last_webhook_event_at: Date }>("SELECT last_webhook_event_at FROM WhatsAppSettings WHERE id = 1")
        expect(settings.rows[0]?.last_webhook_event_at).toEqual(previousEvent)
    })
})
