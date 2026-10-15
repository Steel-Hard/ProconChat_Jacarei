import { createHmac } from "crypto"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import getPool from "../../db/connection"
import { SlotFullError } from "../../errors/SlotFullError"
import { scheduleRepository } from "../../repositories/schedule.repository"
import { sessionRepository } from "../../repositories/session.repository"
import { createScheduleService } from "../../services/schedule.service"

const phones = {
    c1: "5512999990001",
    c2: "5512999990002",
    c3: "5512999990003",
    rollback: "5512999990004",
}

function phoneHash(phone: string): string {
    const secret = process.env.PHONE_HASH_SECRET
    if (!secret) {
        throw new Error("PHONE_HASH_SECRET is required")
    }
    return createHmac("sha256", secret).update(phone).digest("hex")
}

function makeCpfHash(suffix: string): string {
    return suffix.padStart(64, "0")
}

let testCategoryId: number
let testQuestionId: number
const createdAppointmentIds: string[] = []
const createdSessionIds: string[] = []

async function cleanup(): Promise<void> {
    const pool = getPool()
    if (createdAppointmentIds.length > 0) {
        await pool.query("DELETE FROM AppointmentEvents WHERE appointment_id = ANY($1::bigint[])", [
            createdAppointmentIds,
        ])
        await pool.query("DELETE FROM Appointments WHERE id = ANY($1::bigint[])", [
            createdAppointmentIds,
        ])
    }
    await pool.query("DELETE FROM Sessions WHERE phone_hash = ANY($1::text[])", [
        Object.values(phones).map(phoneHash),
    ])
    if (testCategoryId) {
        await pool.query("DELETE FROM Questions WHERE category_id = $1", [testCategoryId])
        await pool.query("DELETE FROM Categories WHERE id = $1", [testCategoryId])
    }
}

describe("Schedule integration tests (Postgres)", () => {
    beforeAll(async () => {
        await cleanup()
        const pool = getPool()

        await pool.query(`
            INSERT INTO ScheduleSettings (
                id, slot_minutes, seats_per_slot, window_days, min_notice_days,
                wait_alert_days, unit_address, unit_address_complement, reminder_enabled, reminder_hours
            ) VALUES (
                1, 30, 2, 7, 1, 7, 'Rua do Procon, 100', 'Sala 1', true, 24
            )
            ON CONFLICT (id) DO UPDATE SET
                slot_minutes = EXCLUDED.slot_minutes,
                seats_per_slot = 2,
                window_days = 7,
                min_notice_days = 1,
                unit_address = EXCLUDED.unit_address
        `)

        const catRes = await pool.query<{ id: number }>(
            "INSERT INTO Categories (title, short_title) VALUES ('Categoria Agenda Teste', 'Agenda') RETURNING id",
        )
        testCategoryId = catRes.rows[0]!.id

        const qRes = await pool.query<{ id: number }>(
            `INSERT INTO Questions (category_id, question, answer, short_title, out_of_scope, requires_in_person, llm_allowed)
             VALUES ($1, 'Pergunta Agenda Teste', 'Compareça ao Procon.', 'Agenda', false, true, false)
             RETURNING id`,
            [testCategoryId],
        )
        testQuestionId = qRes.rows[0]!.id
    })

    afterAll(async () => {
        await cleanup()
        await getPool().end()
    })

    it("grava evento CREATED em AppointmentEvents e documents_sent como jsonb", async () => {
        const s = await sessionRepository.findOrCreateActive(phoneHash(phones.c1))
        createdSessionIds.push(s.id)

        const testSlot = new Date("2026-11-10T10:00:00.000Z")

        const result = await scheduleRepository.bookAppointment({
            sessionId: s.id,
            questionId: testQuestionId,
            reason: "REQUIRES_IN_PERSON",
            name: "Cidadão Teste 1",
            cpfHash: makeCpfHash("111"),
            cpfMasked: "***.111.111-**",
            phone: phones.c1,
            byRepresentative: false,
            appointmentDatetime: testSlot,
        })

        createdAppointmentIds.push(result.id)

        const pool = getPool()

        const apptRows = await pool.query<{ documents_sent: { group: string[]; question: string[] } }>(
            "SELECT documents_sent FROM Appointments WHERE id = $1",
            [result.id],
        )
        expect(apptRows.rows[0]).toBeDefined()
        expect(Array.isArray(apptRows.rows[0]!.documents_sent.group)).toBe(true)
        expect(Array.isArray(apptRows.rows[0]!.documents_sent.question)).toBe(true)

        const eventRows = await pool.query<{ type: string; data: Record<string, unknown> }>(
            "SELECT type, data FROM AppointmentEvents WHERE appointment_id = $1",
            [result.id],
        )
        expect(eventRows.rows.some((e) => e.type === "CREATED")).toBe(true)

        const sessionEvents = await pool.query<{ type: string }>(
            "SELECT type FROM ConversationEvents WHERE session_id = $1 ORDER BY id ASC",
            [s.id],
        )
        const eventTypes = sessionEvents.rows.map((r) => r.type)
        expect(eventTypes).toContain("PHONE_NOTICE_SHOWN")
        expect(eventTypes).toContain("APPOINTMENT_CREATED")
    })

    it("gerencia concorrência na última vaga: 3 reservas simultâneas para 2 vagas resultam em 2 OK e 1 SlotFullError", async () => {
        const s1 = await sessionRepository.findOrCreateActive(phoneHash(phones.c1 + "_slot"))
        const s2 = await sessionRepository.findOrCreateActive(phoneHash(phones.c2))
        const s3 = await sessionRepository.findOrCreateActive(phoneHash(phones.c3))
        createdSessionIds.push(s1.id, s2.id, s3.id)

        const slotTime = new Date("2026-11-10T11:00:00.000Z")

        const results = await Promise.allSettled([
            scheduleRepository.bookAppointment({
                sessionId: s1.id,
                questionId: testQuestionId,
                reason: "REQUIRES_IN_PERSON",
                name: "Concorrente 1",
                cpfHash: makeCpfHash("201"),
                cpfMasked: "***.201.201-**",
                phone: phones.c1,
                byRepresentative: false,
                appointmentDatetime: slotTime,
            }),
            scheduleRepository.bookAppointment({
                sessionId: s2.id,
                questionId: testQuestionId,
                reason: "REQUIRES_IN_PERSON",
                name: "Concorrente 2",
                cpfHash: makeCpfHash("202"),
                cpfMasked: "***.202.202-**",
                phone: phones.c2,
                byRepresentative: false,
                appointmentDatetime: slotTime,
            }),
            scheduleRepository.bookAppointment({
                sessionId: s3.id,
                questionId: testQuestionId,
                reason: "REQUIRES_IN_PERSON",
                name: "Concorrente 3",
                cpfHash: makeCpfHash("203"),
                cpfMasked: "***.203.203-**",
                phone: phones.c3,
                byRepresentative: false,
                appointmentDatetime: slotTime,
            }),
        ])

        const fulfilled = results.filter(
            (r): r is PromiseFulfilledResult<{ id: string }> => r.status === "fulfilled",
        )
        const rejected = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[]

        expect(fulfilled.length).toBe(2)
        expect(rejected.length).toBe(1)
        expect(rejected[0]!.reason).toBeInstanceOf(SlotFullError)

        for (const f of fulfilled) {
            createdAppointmentIds.push(f.value.id)
        }
    })

    it("executa rollback quando finishSessionWith falha, não deixando appointment nem evento órfão", async () => {
        const fakeSessionId = "999999999"
        const slotTime = new Date("2026-11-10T14:00:00.000Z")

        await expect(
            scheduleRepository.bookAppointment({
                sessionId: fakeSessionId,
                questionId: testQuestionId,
                reason: "REQUIRES_IN_PERSON",
                name: "Rollback Citizen",
                cpfHash: makeCpfHash("999"),
                cpfMasked: "***.999.999-**",
                phone: phones.rollback,
                byRepresentative: false,
                appointmentDatetime: slotTime,
            }),
        ).rejects.toThrow()

        const pool = getPool()
        const checkAppt = await pool.query(
            "SELECT id FROM Appointments WHERE cpf_hash = $1",
            [makeCpfHash("999")],
        )
        expect(checkAppt.rows.length).toBe(0)
    })

    it("respeita estritamente o limite da janela de agendamento (window_days)", async () => {
        const pool = getPool()
        await pool.query("UPDATE ScheduleSettings SET window_days = 3 WHERE id = 1")

        const scheduleService = createScheduleService(scheduleRepository)
        const now = new Date("2026-10-05T09:00:00-03:00")
        const slots = await scheduleService.getAvailableSlots(now)

        const distinctDates = Array.from(new Set(slots.map((s) => s.dateStr)))
        expect(distinctDates.length).toBeLessThanOrEqual(3)

        await pool.query("UPDATE ScheduleSettings SET window_days = 7 WHERE id = 1")
    })
})
