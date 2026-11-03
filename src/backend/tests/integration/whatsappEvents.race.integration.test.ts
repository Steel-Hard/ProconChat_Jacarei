import { afterAll, beforeAll, describe, expect, test } from "vitest"
import getPool from "../../db/connection"
import { createAppointmentRepository } from "../../repositories/appointment.repository"
import { outboundMessageRepository } from "../../repositories/outboundMessage.repository"
import { hashProviderMessageId } from "../../utils/providerMessageHash"
import { createAppointmentScope, createTestAppointment, deleteAppointmentScope, OwnedAppointmentScope } from "./helpers/appointmentsDb"
import { createTestUser, deleteTestUsers, TestUser } from "./helpers/usersDb"

const NOW = new Date("2031-05-20T12:00:00.000Z")
const PREFIX = `wamid.race88.${process.pid}.${Date.now()}`
const ROUNDS = 5
let sequence = 0
const createdWamids: string[] = []
let staff: TestUser
let scope: OwnedAppointmentScope

function wamid(): string {
    sequence += 1
    const id = `${PREFIX}.${sequence}`
    createdWamids.push(id)
    return id
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

async function storedRows(providerMessageId: string) {
    const result = await getPool().query<{ kind: string; status: string; error_code: string | null; appointment_id: string | null }>(
        "SELECT kind, status, error_code, appointment_id FROM OutboundMessages WHERE provider_message_hash = $1",
        [hashProviderMessageId(providerMessageId)],
    )
    return result.rows
}

async function noticeTypes(appointmentId: number): Promise<string[]> {
    const result = await getPool().query<{ type: string }>(
        `SELECT type FROM AppointmentEvents
         WHERE appointment_id = $1 AND type IN ('CITIZEN_NOTIFIED', 'CITIZEN_NOTIFICATION_FAILED') AND created_at >= $2
         ORDER BY created_at, id`,
        [appointmentId, NOW],
    )
    return result.rows.map((row) => row.type)
}

describe("Corrida dos status de entrega com Postgres", () => {
    beforeAll(async () => {
        staff = await createTestUser()
        scope = await createAppointmentScope(staff.id, "it88_race")
    })

    afterAll(async () => {
        try {
            const hashes = createdWamids.map(hashProviderMessageId)
            await getPool().query("DELETE FROM OutboundMessages WHERE provider_message_hash = ANY($1::text[])", [hashes])
            await getPool().query("DELETE FROM OutboundMessages WHERE appointment_id = ANY($1::bigint[])", [scope.createdAppointmentIds])
            await deleteAppointmentScope(scope)
            await deleteTestUsers([staff.createdId])
        } finally {
            await getPool().end()
        }
    })

    test("dois failed simultaneos do mesmo wamid de aviso deixam uma linha FAILED e um unico CITIZEN_NOTIFICATION_FAILED", async () => {
        for (let round = 0; round < ROUNDS; round += 1) {
            const appointmentId = await canceledAppointment()
            const id = wamid()
            await createAppointmentRepository().recordCitizenNotification(String(appointmentId), "NOTIFIED", "CANCELLATION", staff.id, NOW, id)
            const failed = { providerMessageId: id, status: "FAILED" as const, statusAt: null, errorCode: "131047" }

            await Promise.all([
                outboundMessageRepository.applyStatuses([failed], NOW),
                outboundMessageRepository.applyStatuses([failed], NOW),
            ])

            expect(await storedRows(id)).toEqual([
                { kind: "CANCELLATION", status: "FAILED", error_code: "131047", appointment_id: String(appointmentId) },
            ])
            expect(await noticeTypes(appointmentId)).toEqual(["CITIZEN_NOTIFIED", "CITIZEN_NOTIFICATION_FAILED"])
        }
    })

    test("dois failed simultaneos de wamid desconhecido deixam uma linha REPLY FAILED", async () => {
        for (let round = 0; round < ROUNDS; round += 1) {
            const id = wamid()
            const failed = { providerMessageId: id, status: "FAILED" as const, statusAt: null, errorCode: "131026" }

            await Promise.all([
                outboundMessageRepository.applyStatuses([failed], NOW),
                outboundMessageRepository.applyStatuses([failed], NOW),
            ])

            expect(await storedRows(id)).toEqual([{ kind: "REPLY", status: "FAILED", error_code: "131026", appointment_id: null }])
        }
    })

    test("envio do aviso e failed simultaneos terminam CANCELLATION FAILED com um unico CITIZEN_NOTIFICATION_FAILED depois do CITIZEN_NOTIFIED", async () => {
        for (let round = 0; round < ROUNDS; round += 1) {
            const appointmentId = await canceledAppointment()
            const id = wamid()

            await Promise.all([
                createAppointmentRepository().recordCitizenNotification(String(appointmentId), "NOTIFIED", "CANCELLATION", staff.id, NOW, id),
                outboundMessageRepository.applyStatuses([{ providerMessageId: id, status: "FAILED", statusAt: null, errorCode: "131047" }], NOW),
            ])

            expect(await storedRows(id)).toEqual([
                { kind: "CANCELLATION", status: "FAILED", error_code: "131047", appointment_id: String(appointmentId) },
            ])
            expect(await noticeTypes(appointmentId)).toEqual(["CITIZEN_NOTIFIED", "CITIZEN_NOTIFICATION_FAILED"])
            const target = await createAppointmentRepository().findCancellationNoticeTarget(String(appointmentId))
            expect(target?.lastCancellationNotice).toBe("FAILED")
        }
    })
})
