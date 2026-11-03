import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest"
import getPool from "../../db/connection"
import { createAppointmentRepository } from "../../repositories/appointment.repository"
import { outboundMessageRepository } from "../../repositories/outboundMessage.repository"
import { whatsappSettingsRepository } from "../../repositories/whatsappSettings.repository"
import { hashProviderMessageId } from "../../utils/providerMessageHash"
import { createAppointmentScope, createTestAppointment, deleteAppointmentScope, OwnedAppointmentScope } from "./helpers/appointmentsDb"
import { createTestUser, deleteTestUsers, TestUser } from "./helpers/usersDb"

const NOW = new Date("2031-03-10T12:00:00.000Z")
const WINDOW_START = new Date(Date.UTC(2099, 0, 1) + (process.pid % 1000) * 86_400_000)
const DAY_MS = 86_400_000

function windowSince(day: number): Date {
    return new Date(WINDOW_START.getTime() + day * DAY_MS)
}
const PREFIX = `wamid.it88.${process.pid}.${Date.now()}`
let sequence = 0
const createdWamids: string[] = []

function createdHashes(): string[] {
    return createdWamids.map(hashProviderMessageId)
}
let staff: TestUser
let scope: OwnedAppointmentScope
let originalSettings: Record<string, unknown> | undefined

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

function wamid(): string {
    sequence += 1
    const id = `${PREFIX}.${sequence}`
    createdWamids.push(id)
    return id
}

interface StoredOutbound {
    kind: string
    status: string
    error_code: string | null
    status_at: Date | null
    appointment_id: string | null
}

async function storedRows(providerMessageId: string): Promise<StoredOutbound[]> {
    const result = await getPool().query<StoredOutbound>(
        "SELECT kind, status, error_code, status_at, appointment_id FROM OutboundMessages WHERE provider_message_hash = $1",
        [hashProviderMessageId(providerMessageId)],
    )
    return result.rows
}

async function insertSent(providerMessageId: string, kind = "REPLY", appointmentId: number | null = null): Promise<void> {
    await getPool().query(
        `INSERT INTO OutboundMessages (provider_message_hash, kind, appointment_id, status, status_at)
         VALUES ($1, $2::outbound_kind, $3, 'SENT', $4)`,
        [hashProviderMessageId(providerMessageId), kind, appointmentId, NOW],
    )
}

async function apply(providerMessageId: string, status: "SENT" | "DELIVERED" | "READ" | "FAILED", errorCode: string | null = null) {
    await outboundMessageRepository.applyStatuses([{ providerMessageId, status, statusAt: null, errorCode }], NOW)
}

async function statusOf(providerMessageId: string): Promise<string | undefined> {
    return (await storedRows(providerMessageId))[0]?.status
}

async function insertWithStatus(status: string, statusAt: Date, errorCode: string | null = "131047"): Promise<string> {
    const result = await getPool().query<{ id: string }>(
        `INSERT INTO OutboundMessages (provider_message_hash, kind, status, error_code, status_at)
         VALUES ($1, 'REPLY', $2::outbound_status, $3, $4)
         RETURNING id`,
        [hashProviderMessageId(wamid()), status, errorCode, statusAt],
    )
    return String(result.rows[0]?.id)
}

async function canceledAppointment(): Promise<number> {
    const id = await createTestAppointment(scope, { status: "CANCELED", assignedUserId: staff.id })
    await getPool().query(
        `INSERT INTO AppointmentEvents (appointment_id, type, actor_user_id, data, created_at)
         VALUES ($1, 'CITIZEN_NOTIFIED', $2, '{"kind":"CANCELLATION"}', $3)`,
        [id, staff.id, new Date(NOW.getTime() - 60_000)],
    )
    return id
}

async function outboundOfAppointment(appointmentId: number) {
    const result = await getPool().query<StoredOutbound & { provider_message_hash: string | null }>(
        "SELECT provider_message_hash, kind, status, error_code, status_at, appointment_id FROM OutboundMessages WHERE appointment_id = $1",
        [appointmentId],
    )
    return result.rows
}

async function noticeEvents(appointmentId: number) {
    const result = await getPool().query<{ type: string; actor_user_id: string | null; data: unknown; created_at: Date }>(
        `SELECT type, actor_user_id, data, created_at FROM AppointmentEvents
         WHERE appointment_id = $1 AND type IN ('CITIZEN_NOTIFIED', 'CITIZEN_NOTIFICATION_FAILED') AND created_at >= $2
         ORDER BY created_at, id`,
        [appointmentId, NOW],
    )
    return result.rows
}

async function failureEvents(appointmentId: number) {
    const result = await getPool().query<{ actor_user_id: string | null; data: unknown; created_at: Date }>(
        "SELECT actor_user_id, data, created_at FROM AppointmentEvents WHERE appointment_id = $1 AND type = 'CITIZEN_NOTIFICATION_FAILED'",
        [appointmentId],
    )
    return result.rows
}

describe("Repositorio de mensagens enviadas com Postgres", () => {
    beforeAll(async () => {
        originalSettings = (await getPool().query<Record<string, unknown>>("SELECT * FROM WhatsAppSettings WHERE id = 1")).rows[0]
        staff = await createTestUser()
        scope = await createAppointmentScope(staff.id, "it88_outbound")
    })

    afterEach(async () => {
        await getPool().query("DELETE FROM OutboundMessages WHERE provider_message_hash = ANY($1::text[]) AND status_at >= $2", [
            createdHashes(),
            WINDOW_START,
        ])
    })

    afterAll(async () => {
        try {
            await getPool().query("DELETE FROM OutboundMessages WHERE provider_message_hash = ANY($1::text[])", [createdHashes()])
            await getPool().query("DELETE FROM OutboundMessages WHERE appointment_id = ANY($1::bigint[])", [scope.createdAppointmentIds])
            await deleteAppointmentScope(scope)
            await restoreSettings()
            await deleteTestUsers([staff.createdId])
        } finally {
            await getPool().end()
        }
    })

    test("failed de wamid desconhecido insere REPLY FAILED com o codigo e a data da Meta", async () => {
        const id = wamid()
        const statusAt = new Date("2031-03-10T11:59:00.000Z")

        await outboundMessageRepository.applyStatuses(
            [{ providerMessageId: id, status: "FAILED", statusAt, errorCode: "131047" }],
            NOW,
        )

        expect(await storedRows(id)).toEqual([
            { kind: "REPLY", status: "FAILED", error_code: "131047", status_at: statusAt, appointment_id: null },
        ])
    })

    test("failed de wamid desconhecido grava so o HMAC do wamid e nenhuma coluna guarda o wamid", async () => {
        const id = wamid()

        await apply(id, "FAILED", "131047")

        const result = await getPool().query<Record<string, unknown>>(
            "SELECT * FROM OutboundMessages WHERE provider_message_hash = $1",
            [hashProviderMessageId(id)],
        )
        expect(result.rows).toHaveLength(1)
        expect(result.rows[0]?.provider_message_hash).toBe(hashProviderMessageId(id))
        expect(JSON.stringify(result.rows)).not.toContain(id)
    })

    test("sent, delivered e read de wamid desconhecido nao inserem nada", async () => {
        const ids = [wamid(), wamid(), wamid()]

        await outboundMessageRepository.applyStatuses(
            [
                { providerMessageId: ids[0] as string, status: "SENT", statusAt: null, errorCode: null },
                { providerMessageId: ids[1] as string, status: "DELIVERED", statusAt: null, errorCode: null },
                { providerMessageId: ids[2] as string, status: "READ", statusAt: null, errorCode: null },
            ],
            NOW,
        )

        for (const id of ids) {
            expect(await storedRows(id)).toEqual([])
        }
    })

    test("status de wamid gravado so avanca de SENT para DELIVERED e READ e nada muda depois de FAILED", async () => {
        const advancing = wamid()
        const failed = wamid()
        await insertSent(advancing)
        await insertSent(failed)

        await apply(advancing, "DELIVERED")
        const afterDelivered = await statusOf(advancing)
        await apply(advancing, "READ")
        const afterRead = await statusOf(advancing)
        await apply(advancing, "DELIVERED")
        await apply(failed, "FAILED", "131026")
        await apply(failed, "READ")

        expect(afterDelivered).toBe("DELIVERED")
        expect(afterRead).toBe("READ")
        expect(await statusOf(advancing)).toBe("READ")
        expect(await storedRows(failed)).toEqual([
            { kind: "REPLY", status: "FAILED", error_code: "131026", status_at: NOW, appointment_id: null },
        ])
    })

    test("delivered e failed do mesmo wamid na mesma lista terminam FAILED nas duas ordens", async () => {
        const deliveredFirst = wamid()
        const failedFirst = wamid()
        await insertSent(deliveredFirst)
        await insertSent(failedFirst)

        await outboundMessageRepository.applyStatuses(
            [
                { providerMessageId: deliveredFirst, status: "DELIVERED", statusAt: null, errorCode: null },
                { providerMessageId: deliveredFirst, status: "FAILED", statusAt: null, errorCode: "131047" },
                { providerMessageId: failedFirst, status: "FAILED", statusAt: null, errorCode: "131047" },
                { providerMessageId: failedFirst, status: "DELIVERED", statusAt: null, errorCode: null },
            ],
            NOW,
        )

        expect(await statusOf(deliveredFirst)).toBe("FAILED")
        expect(await statusOf(failedFirst)).toBe("FAILED")
    })

    test("status sem timestamp da Meta grava status_at com o now recebido", async () => {
        const id = wamid()

        await apply(id, "FAILED", "131000")

        expect((await storedRows(id))[0]?.status_at).toEqual(NOW)
    })

    test("linha CANCELLATION que vira FAILED grava a falha no historico do agendamento e libera o reenvio", async () => {
        const appointmentId = await canceledAppointment()
        const id = wamid()
        await insertSent(id, "CANCELLATION", appointmentId)

        await apply(id, "FAILED", "131047")

        expect(await failureEvents(appointmentId)).toEqual([
            { actor_user_id: null, data: { kind: "CANCELLATION" }, created_at: NOW },
        ])
        const target = await createAppointmentRepository().findCancellationNoticeTarget(String(appointmentId))
        expect(target?.lastCancellationNotice).toBe("FAILED")
    })

    test("um segundo failed do mesmo wamid de aviso nao grava outra falha no historico", async () => {
        const appointmentId = await canceledAppointment()
        const id = wamid()
        await insertSent(id, "CANCELLATION", appointmentId)

        await apply(id, "FAILED", "131047")
        await apply(id, "FAILED", "131047")

        expect(await failureEvents(appointmentId)).toHaveLength(1)
        expect(await storedRows(id)).toHaveLength(1)
    })

    test("listRecentFailures deixa fora a falha exatamente em since e inclui a de 1 ms depois", async () => {
        const since = windowSince(0)
        await insertWithStatus("FAILED", since)
        const inside = await insertWithStatus("FAILED", new Date(since.getTime() + 1))

        const page = await outboundMessageRepository.listRecentFailures(since, 50)

        expect(page.count).toBe(1)
        expect(page.items.map((item) => item.id)).toEqual([inside])
    })

    test("listRecentFailures conta e lista so as linhas FAILED", async () => {
        const since = windowSince(1)
        const later = new Date(since.getTime() + 60_000)
        for (const status of ["SENT", "DELIVERED", "READ"]) {
            await insertWithStatus(status, later, null)
        }
        const failed = await insertWithStatus("FAILED", later)

        const page = await outboundMessageRepository.listRecentFailures(since, 50)

        expect(page).toEqual({
            count: 1,
            items: [{ id: failed, kind: "REPLY", errorCode: "131047", failedAt: later, appointmentId: null }],
        })
    })

    test("listRecentFailures ordena da falha mais recente para a mais antiga", async () => {
        const since = windowSince(2)
        const oldest = await insertWithStatus("FAILED", new Date(since.getTime() + 1_000))
        const newest = await insertWithStatus("FAILED", new Date(since.getTime() + 3_000))
        const middle = await insertWithStatus("FAILED", new Date(since.getTime() + 2_000))

        const page = await outboundMessageRepository.listRecentFailures(since, 50)

        expect(page.items.map((item) => item.id)).toEqual([newest, middle, oldest])
    })

    test("listRecentFailures devolve no maximo o limite e conta todas as falhas da janela", async () => {
        const since = windowSince(3)
        for (let index = 1; index <= 51; index += 1) {
            await insertWithStatus("FAILED", new Date(since.getTime() + index * 1_000))
        }

        const page = await outboundMessageRepository.listRecentFailures(since, 50)

        expect(page.count).toBe(51)
        expect(page.items).toHaveLength(50)
        expect(page.items[0]?.failedAt).toEqual(new Date(since.getTime() + 51_000))
    })

    test("touchLastWebhookEvent grava a data do evento sem mudar a ultima alteracao e nao cria a linha ausente", async () => {
        const updatedAt = new Date("2031-01-01T08:00:00.000Z")
        const eventAt = new Date("2031-03-10T11:58:00.000Z")
        await getPool().query("DELETE FROM WhatsAppSettings")
        await getPool().query(
            "INSERT INTO WhatsAppSettings (id, verify_token, updated_by, updated_at) VALUES (1, $1, $2, $3)",
            ["b".repeat(64), staff.id, updatedAt],
        )

        await whatsappSettingsRepository.touchLastWebhookEvent(eventAt)
        const touched = await getPool().query("SELECT last_webhook_event_at, updated_by, updated_at FROM WhatsAppSettings")
        await getPool().query("DELETE FROM WhatsAppSettings")
        await whatsappSettingsRepository.touchLastWebhookEvent(eventAt)
        const afterMissing = await getPool().query("SELECT 1 FROM WhatsAppSettings")

        expect(touched.rows).toEqual([{ last_webhook_event_at: eventAt, updated_by: String(staff.id), updated_at: updatedAt }])
        expect(afterMissing.rows).toEqual([])
    })

    test("aviso aceito com wamid grava CITIZEN_NOTIFIED e a mensagem CANCELLATION SENT ligada ao agendamento", async () => {
        const appointmentId = await canceledAppointment()
        const id = wamid()

        await createAppointmentRepository().recordCitizenNotification(String(appointmentId), "NOTIFIED", "CANCELLATION", staff.id, NOW, id)

        expect(await noticeEvents(appointmentId)).toEqual([
            { type: "CITIZEN_NOTIFIED", actor_user_id: String(staff.id), data: { kind: "CANCELLATION" }, created_at: NOW },
        ])
        expect(await outboundOfAppointment(appointmentId)).toEqual([
            {
                provider_message_hash: hashProviderMessageId(id),
                kind: "CANCELLATION",
                status: "SENT",
                error_code: null,
                status_at: NOW,
                appointment_id: String(appointmentId),
            },
        ])
    })

    test("delivered posterior ao aviso aceito acha a linha do aviso pelo HMAC do mesmo wamid", async () => {
        const appointmentId = await canceledAppointment()
        const id = wamid()
        await createAppointmentRepository().recordCitizenNotification(String(appointmentId), "NOTIFIED", "CANCELLATION", staff.id, NOW, id)

        await apply(id, "DELIVERED")

        expect(await outboundOfAppointment(appointmentId)).toEqual([
            {
                provider_message_hash: hashProviderMessageId(id),
                kind: "CANCELLATION",
                status: "DELIVERED",
                error_code: null,
                status_at: NOW,
                appointment_id: String(appointmentId),
            },
        ])
    })

    test("aviso aceito sem wamid grava so o CITIZEN_NOTIFIED", async () => {
        const appointmentId = await canceledAppointment()

        await createAppointmentRepository().recordCitizenNotification(String(appointmentId), "NOTIFIED", "CANCELLATION", staff.id, NOW, null)

        expect((await noticeEvents(appointmentId)).map((event) => event.type)).toEqual(["CITIZEN_NOTIFIED"])
        expect(await outboundOfAppointment(appointmentId)).toEqual([])
    })

    test("aviso recusado grava a falha no historico e a mensagem CANCELLATION FAILED sem wamid que entra nas falhas recentes", async () => {
        const appointmentId = await canceledAppointment()
        const failedAt = new Date("2031-04-02T09:30:00.000Z")

        await createAppointmentRepository().recordCitizenNotification(String(appointmentId), "FAILED", "CANCELLATION", staff.id, failedAt)

        expect((await noticeEvents(appointmentId)).map((event) => event.type)).toEqual(["CITIZEN_NOTIFICATION_FAILED"])
        const rows = await outboundOfAppointment(appointmentId)
        expect(rows).toEqual([
            {
                provider_message_hash: null,
                kind: "CANCELLATION",
                status: "FAILED",
                error_code: null,
                status_at: failedAt,
                appointment_id: String(appointmentId),
            },
        ])
        const page = await outboundMessageRepository.listRecentFailures(new Date(failedAt.getTime() - 1), 50)
        expect(page.items.find((item) => item.appointmentId === String(appointmentId))).toEqual({
            id: expect.any(String),
            kind: "CANCELLATION",
            errorCode: null,
            failedAt,
            appointmentId: String(appointmentId),
        })
    })

    test("failed que chega antes da gravacao do envio fica uma linha CANCELLATION FAILED e o historico termina em FAILED, em 5 rodadas", async () => {
        for (let round = 0; round < 5; round += 1) {
            const appointmentId = await canceledAppointment()
            const id = wamid()
            await apply(id, "FAILED", "131047")

            await createAppointmentRepository().recordCitizenNotification(String(appointmentId), "NOTIFIED", "CANCELLATION", staff.id, NOW, id)

            expect(await storedRows(id)).toEqual([
                { kind: "CANCELLATION", status: "FAILED", error_code: "131047", status_at: NOW, appointment_id: String(appointmentId) },
            ])
            expect(await noticeEvents(appointmentId)).toEqual([
                { type: "CITIZEN_NOTIFIED", actor_user_id: String(staff.id), data: { kind: "CANCELLATION" }, created_at: NOW },
                {
                    type: "CITIZEN_NOTIFICATION_FAILED",
                    actor_user_id: null,
                    data: { kind: "CANCELLATION" },
                    created_at: new Date(NOW.getTime() + 1),
                },
            ])
            const target = await createAppointmentRepository().findCancellationNoticeTarget(String(appointmentId))
            expect(target?.lastCancellationNotice).toBe("FAILED")
        }
    })
})
