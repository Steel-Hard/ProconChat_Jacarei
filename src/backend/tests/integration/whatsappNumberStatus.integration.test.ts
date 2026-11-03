import { randomBytes } from "node:crypto"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import getPool from "../../db/connection"
import { createAppointmentRepository } from "../../repositories/appointment.repository"
import {
    createAppointmentScope,
    createTestAppointment,
    deleteAppointmentScope,
    firstRow,
    OwnedAppointmentScope,
} from "./helpers/appointmentsDb"
import { createTestUser, deleteTestUsers, TestUser } from "./helpers/usersDb"

const NOW = new Date("2032-05-10T12:00:00.000Z")
const DAY_MS = 24 * 60 * 60 * 1000
const repository = createAppointmentRepository()

describe("Contagem de telefones avisados nas últimas 24h com Postgres", () => {
    const createdUserIds: (number | null)[] = []
    const sessionIds: number[] = []
    let admin: TestUser
    let scope: OwnedAppointmentScope

    async function sessionFor(phoneHash: string): Promise<number> {
        const id = Number(
            firstRow(
                (
                    await getPool().query<{ id: string }>(
                        `INSERT INTO Sessions (phone_hash, status, outcome, current_step)
                         VALUES ($1, 'FINISHED', 'SCHEDULED', 'FINISHED')
                         RETURNING id`,
                        [phoneHash],
                    )
                ).rows,
            ).id,
        )
        sessionIds.push(id)
        return id
    }

    async function notified(phoneHash: string, type: string, kind: string, createdAt: Date): Promise<void> {
        const sessionId = await sessionFor(phoneHash)
        const id = await createTestAppointment(scope, { status: "CANCELED", cpfHash: randomBytes(32).toString("hex") })
        await getPool().query("UPDATE Appointments SET session_id = $2 WHERE id = $1", [id, sessionId])
        await getPool().query(
            `INSERT INTO AppointmentEvents (appointment_id, type, data, created_at)
             VALUES ($1, $2::appointment_event_type, $3::jsonb, $4)`,
            [id, type, JSON.stringify({ kind }), createdAt],
        )
    }

    beforeAll(async () => {
        admin = await createTestUser({ isAdmin: true })
        createdUserIds.push(admin.createdId)
        scope = await createAppointmentScope(admin.id, "number_status")
    })

    afterAll(async () => {
        const pool = getPool()
        await pool.query("DELETE FROM AppointmentEvents WHERE appointment_id = ANY($1::bigint[])", [scope.createdAppointmentIds])
        await pool.query("DELETE FROM Appointments WHERE id = ANY($1::bigint[])", [scope.createdAppointmentIds])
        scope.createdAppointmentIds.length = 0
        await pool.query("DELETE FROM Sessions WHERE id = ANY($1::bigint[])", [sessionIds])
        await deleteAppointmentScope(scope)
        await deleteTestUsers(createdUserIds)
        await pool.end()
    })

    it("conta uma vez cada telefone com CITIZEN_NOTIFIED de cancelamento ou lembrete em [agora - 24h, agora]", async () => {
        const repeated = randomBytes(32).toString("hex")
        await notified(repeated, "CITIZEN_NOTIFIED", "CANCELLATION", new Date(NOW.getTime() - 120_000))
        await notified(repeated, "CITIZEN_NOTIFIED", "REMINDER", new Date(NOW.getTime() - 60_000))
        await notified(randomBytes(32).toString("hex"), "CITIZEN_NOTIFIED", "CANCELLATION", new Date(NOW.getTime() - DAY_MS))
        await notified(randomBytes(32).toString("hex"), "CITIZEN_NOTIFIED", "REMINDER", NOW)
        await notified(randomBytes(32).toString("hex"), "CITIZEN_NOTIFIED", "CANCELLATION", new Date(NOW.getTime() - DAY_MS - 1))
        await notified(randomBytes(32).toString("hex"), "CITIZEN_NOTIFIED", "CANCELLATION", new Date(NOW.getTime() + 1))
        await notified(randomBytes(32).toString("hex"), "CITIZEN_NOTIFICATION_FAILED", "CANCELLATION", new Date(NOW.getTime() - 60_000))
        await notified(randomBytes(32).toString("hex"), "CITIZEN_NOTIFIED", "OUTRO", new Date(NOW.getTime() - 60_000))

        const count = await repository.countNotifiedPhonesBetween(new Date(NOW.getTime() - DAY_MS), NOW)

        expect(count).toBe(3)
    })
})
