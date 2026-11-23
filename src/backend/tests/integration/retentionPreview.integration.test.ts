import request from "supertest"
import { afterAll, beforeAll, describe, expect, test } from "vitest"
import app from "../../app"
import getPool from "../../db/connection"
import { encrypt } from "../../utils/crypto.utils"
import { firstRow } from "./helpers/appointmentsDb"
import { hashPhone } from "./helpers/phone"
import { cleanupScheduleTestData, createTestQuestion } from "./helpers/scheduleDb"
import { createTestUser, deleteTestUsers, TestUser } from "./helpers/usersDb"

const PATH = "/api/v1/whatsapp/settings/privacy/retention-preview"
const OLD = new Date("1999-01-01T12:00:00Z")

interface Anonymized {
    sessions: number
    appointments: number
}

async function anonymizedTotals(): Promise<Anonymized> {
    const result = await getPool().query<Anonymized>(
        `SELECT
            (SELECT count(*)::int FROM Sessions WHERE anonymized_at IS NOT NULL) AS sessions,
            (SELECT count(*)::int FROM Appointments WHERE anonymized_at IS NOT NULL) AS appointments`,
    )
    return firstRow(result.rows)
}

describe("rota da previa da anonimizacao com Postgres", () => {
    let admin: TestUser
    let sessionId: string
    let appointmentId: string
    let phoneHash: string

    beforeAll(async () => {
        admin = await createTestUser({ isAdmin: true })
        const { questionId } = await createTestQuestion()
        phoneHash = hashPhone("55000000071001")
        const session = await getPool().query<{ id: string }>(
            `INSERT INTO Sessions (phone_hash, status, outcome, current_step, started_at, ended_at, last_interaction_at)
             VALUES ($1, 'FINISHED', 'RESOLVED', 'FINISHED', $2, $2, $2)
             RETURNING id`,
            [phoneHash, OLD],
        )
        sessionId = firstRow(session.rows).id
        const appointment = await getPool().query<{ id: string }>(
            `INSERT INTO Appointments (
                session_id, question_id, reason, name, cpf_hash, cpf_masked, phone_encrypted,
                documents_sent, appointment_datetime, status
             ) VALUES ($1, $2, 'REQUIRES_IN_PERSON', 'Cidadão Prévia', $3, '***.982.247-**', $4, $6::jsonb, $5, 'PENDING')
             RETURNING id`,
            [
                sessionId,
                questionId,
                "a".repeat(64),
                encrypt("55000000071001"),
                OLD,
                JSON.stringify({ group: ["RG"], question: ["Contrato"] }),
            ],
        )
        appointmentId = firstRow(appointment.rows).id
    })

    afterAll(async () => {
        try {
            await getPool().query("DELETE FROM Appointments WHERE id = $1", [appointmentId])
            await getPool().query("DELETE FROM Sessions WHERE id = $1", [sessionId])
            await cleanupScheduleTestData({ phoneHashes: [], appointmentIds: [] })
            await deleteTestUsers([admin.createdId])
        } finally {
            await getPool().end()
        }
    })

    test("conta o que venceu sem anonimizar nenhuma linha", async () => {
        const before = await anonymizedTotals()

        const response = await request(app)
            .get(`${PATH}?sessionDays=30&appointmentDays=90`)
            .set("Cookie", admin.cookie)

        expect(response.status).toBe(200)
        expect(response.body.data.sessions).toBeGreaterThanOrEqual(1)
        expect(response.body.data.appointments).toBeGreaterThanOrEqual(1)
        expect(await anonymizedTotals()).toEqual(before)
        const session = firstRow(
            (
                await getPool().query<{ phone_hash: string | null; anonymized_at: Date | null }>(
                    "SELECT phone_hash, anonymized_at FROM Sessions WHERE id = $1",
                    [sessionId],
                )
            ).rows,
        )
        expect(session).toEqual({ phone_hash: phoneHash, anonymized_at: null })
        const stored = firstRow(
            (
                await getPool().query<{ name: string; anonymized_at: Date | null }>(
                    "SELECT name, anonymized_at FROM Appointments WHERE id = $1",
                    [appointmentId],
                )
            ).rows,
        )
        expect(stored).toEqual({ name: "Cidadão Prévia", anonymized_at: null })
    })
})
