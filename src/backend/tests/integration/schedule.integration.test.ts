import { createHmac } from "crypto"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import getPool from "../../db/connection"
import { SlotFullError } from "../../errors/SlotFullError"
import { scheduleRepository } from "../../repositories/schedule.repository"
import { sessionRepository } from "../../repositories/session.repository"
import { createScheduleService } from "../../services/schedule.service"

const phones = {
    c1: "5512999990001",
    c1_slot: "5512999990005",
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
let savedOriginalSettings: Record<string, unknown> | null = null
let insertedRanges = false
const createdAppointmentIds: string[] = []
const createdSessionIds: string[] = []

async function cleanup(): Promise<void> {
    const pool = getPool()
    const hashes = Object.values(phones).map(phoneHash)

    const sessResult = await pool.query<{ id: string }>(
        "SELECT id FROM Sessions WHERE phone_hash = ANY($1::text[])",
        [hashes],
    )
    const sessionIds = sessResult.rows.map((r) => r.id)

    const apptResult = await pool.query<{ id: string }>(
        "SELECT id FROM Appointments WHERE session_id = ANY($1::bigint[]) OR id = ANY($2::bigint[])",
        [
            sessionIds.length > 0 ? sessionIds : [-1],
            createdAppointmentIds.length > 0 ? createdAppointmentIds : [-1],
        ],
    )
    const allApptIds = apptResult.rows.map((r) => r.id)

    if (allApptIds.length > 0) {
        await pool.query("DELETE FROM ConversationEvents WHERE appointment_id = ANY($1::bigint[])", [
            allApptIds,
        ])
        await pool.query("DELETE FROM AppointmentEvents WHERE appointment_id = ANY($1::bigint[])", [
            allApptIds,
        ])
        await pool.query("DELETE FROM Appointments WHERE id = ANY($1::bigint[])", [
            allApptIds,
        ])
    }

    if (sessionIds.length > 0) {
        await pool.query("DELETE FROM ConversationEvents WHERE session_id = ANY($1::bigint[])", [
            sessionIds,
        ])
        await pool.query("DELETE FROM Sessions WHERE id = ANY($1::bigint[])", [
            sessionIds,
        ])
    }

    if (testCategoryId) {
        await pool.query("DELETE FROM Questions WHERE category_id = $1", [testCategoryId])
        await pool.query("DELETE FROM Categories WHERE id = $1", [testCategoryId])
    }
}

describe("Schedule integration tests (Postgres)", () => {
    beforeAll(async () => {
        await cleanup()
        const pool = getPool()

        const existingSettings = await pool.query(
            "SELECT * FROM ScheduleSettings WHERE id = 1",
        )
        savedOriginalSettings = existingSettings.rows[0] ?? null

        const existingRanges = await pool.query("SELECT id FROM ScheduleRanges")
        if (existingRanges.rows.length === 0) {
            insertedRanges = true
            const weekdays = [1, 2, 3, 4, 5]
            for (const weekday of weekdays) {
                await pool.query(
                    "INSERT INTO ScheduleRanges (weekday, slot_index, start_time, end_time) VALUES ($1, 1, '08:00', '12:00')",
                    [weekday],
                )
                await pool.query(
                    "INSERT INTO ScheduleRanges (weekday, slot_index, start_time, end_time) VALUES ($1, 2, '13:00', '17:00')",
                    [weekday],
                )
            }
        }

        await pool.query(`
            INSERT INTO ScheduleSettings (
                id, slot_minutes, seats_per_slot, window_days, min_notice_days,
                wait_alert_days, unit_address, unit_address_complement, reminder_enabled, reminder_hours
            ) VALUES (
                1, 30, 2, 7, 1, 7, 'Rua do Procon, 100', 'Sala 1', true, 24
            )
            ON CONFLICT (id) DO UPDATE SET
                slot_minutes = 30,
                seats_per_slot = 2,
                window_days = 7,
                min_notice_days = 1,
                wait_alert_days = 7,
                unit_address = 'Rua do Procon, 100',
                unit_address_complement = 'Sala 1',
                reminder_enabled = true,
                reminder_hours = 24
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
        const pool = getPool()
        if (insertedRanges) {
            await pool.query("DELETE FROM ScheduleRanges")
        }
        if (savedOriginalSettings) {
            await pool.query(
                `UPDATE ScheduleSettings SET
                    slot_minutes = $1,
                    seats_per_slot = $2,
                    window_days = $3,
                    min_notice_days = $4,
                    wait_alert_days = $5,
                    unit_address = $6,
                    unit_address_complement = $7,
                    reminder_enabled = $8,
                    reminder_hours = $9
                 WHERE id = 1`,
                [
                    savedOriginalSettings.slot_minutes,
                    savedOriginalSettings.seats_per_slot,
                    savedOriginalSettings.window_days,
                    savedOriginalSettings.min_notice_days,
                    savedOriginalSettings.wait_alert_days,
                    savedOriginalSettings.unit_address,
                    savedOriginalSettings.unit_address_complement,
                    savedOriginalSettings.reminder_enabled,
                    savedOriginalSettings.reminder_hours,
                ],
            )
        } else {
            await pool.query("DELETE FROM ScheduleSettings WHERE id = 1")
        }
        await pool.end()
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
        const s1 = await sessionRepository.findOrCreateActive(phoneHash(phones.c1_slot))
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
        const pool = getPool()
        const rollbackPhoneHash = phoneHash(phones.rollback)

        const sessRes = await pool.query<{ id: string }>(
            `INSERT INTO Sessions (
                phone_hash, status, outcome, current_step, ended_at, last_interaction_at
             ) VALUES (
                $1, 'FINISHED', 'RESOLVED', 'FINISHED', now(), now()
             ) RETURNING id`,
            [rollbackPhoneHash],
        )
        const finishedSessionId = sessRes.rows[0]!.id
        createdSessionIds.push(finishedSessionId)

        const slotTime = new Date("2026-11-10T14:00:00.000Z")
        const testCpfHash = makeCpfHash("999")

        await expect(
            scheduleRepository.bookAppointment({
                sessionId: finishedSessionId,
                questionId: testQuestionId,
                reason: "REQUIRES_IN_PERSON",
                name: "Rollback Citizen",
                cpfHash: testCpfHash,
                cpfMasked: "***.999.999-**",
                phone: phones.rollback,
                byRepresentative: false,
                appointmentDatetime: slotTime,
            }),
        ).rejects.toThrow("Conversation session was changed or finished")

        const checkAppt = await pool.query(
            "SELECT id FROM Appointments WHERE cpf_hash = $1 OR session_id = $2",
            [testCpfHash, finishedSessionId],
        )
        expect(checkAppt.rows.length).toBe(0)

        const checkApptEvents = await pool.query(
            "SELECT id FROM AppointmentEvents WHERE appointment_id IN (SELECT id FROM Appointments WHERE cpf_hash = $1)",
            [testCpfHash],
        )
        expect(checkApptEvents.rows.length).toBe(0)

        const checkConvEvents = await pool.query(
            "SELECT id FROM ConversationEvents WHERE session_id = $1",
            [finishedSessionId],
        )
        expect(checkConvEvents.rows.length).toBe(0)
    })

    it("respeita estritamente o limite da janela de agendamento (window_days)", async () => {
        const pool = getPool()
        await pool.query("UPDATE ScheduleSettings SET window_days = 3, min_notice_days = 1 WHERE id = 1")

        const scheduleService = createScheduleService(scheduleRepository)
        const now = new Date("2026-10-05T09:00:00-03:00")
        const slots = await scheduleService.getAvailableSlots(now)

        expect(slots.length).toBeGreaterThan(0)
        const distinctDates = Array.from(new Set(slots.map((s) => s.dateStr)))
        expect(distinctDates).toEqual(["2026-10-06", "2026-10-07", "2026-10-08"])

        await pool.query("UPDATE ScheduleSettings SET window_days = 7, min_notice_days = 1 WHERE id = 1")
    })
})
