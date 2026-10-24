import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import app from "../../app"
import getPool from "../../db/connection"
import SlotFullError from "../../errors/SlotFullError"
import { scheduleRepository } from "../../repositories/schedule.repository"
import { sessionRepository } from "../../repositories/session.repository"
import { createScheduleService } from "../../services/schedule.service"
import type { ConversationFlowResult } from "../../types/conversationFlow.types"
import { BookAppointmentResult } from "../../types/schedule.types"
import { parseLocalDate } from "../../utils/date.utils"
import { hashPhone as phoneHash } from "./helpers/phone"
import {
    cleanupScheduleTestData,
    countRows,
    createTestQuestion,
    restoreScheduleConfig,
    ScheduleConfigSnapshot,
    ScheduleRangeInput,
    ScheduleSettingsInput,
    snapshotScheduleConfig,
    useScheduleConfig,
} from "./helpers/scheduleDb"

const phones = {
    c1: "5512999990001",
    c1_slot: "5512999990005",
    c2: "5512999990002",
    c3: "5512999990003",
    rollback: "5512999990004",
    reasonFlow: "5512999990006",
}

function makeCpfHash(suffix: string): string {
    return suffix.padStart(64, "0")
}

const testSettings: ScheduleSettingsInput = {
    slot_minutes: 30,
    seats_per_slot: 2,
    window_days: 7,
    min_notice_days: 1,
    wait_alert_days: 7,
    unit_address: "Rua do Procon, 100",
    unit_address_complement: "Sala 1",
    reminder_enabled: true,
    reminder_hours: 24,
}

const testRanges: ScheduleRangeInput[] = [1, 2, 3, 4, 5].flatMap((weekday) => [
    { weekday, slot_index: 1, start_time: "08:00", end_time: "12:00" },
    { weekday, slot_index: 2, start_time: "13:00", end_time: "17:00" },
])

let testQuestionId: number
let testCategoryId: number
let savedScheduleConfig: ScheduleConfigSnapshot | null = null
const createdAppointmentIds: string[] = []
const createdSessionIds: string[] = []

async function sendToBot(phone: string, text?: string, optionId?: string): Promise<ConversationFlowResult> {
    const response = await request(app)
        .post("/api/v1/whatsapp/sessions")
        .set("X-Internal-Token", process.env.GATEWAY_INTERNAL_TOKEN as string)
        .send({ phone, text, optionId })

    expect(response.status).toBe(202)
    return response.body.data as ConversationFlowResult
}

function firstSlotOptionId(result: ConversationFlowResult): string {
    const rows = (result.reply.messages ?? []).flatMap((message) => (message.type === "list" ? message.rows : []))
    const slot = rows.find((row) => row.id.startsWith("slot_"))
    if (!slot) {
        throw new Error("A resposta do bot não trouxe horário para escolher")
    }
    return slot.id
}

async function cleanup(): Promise<void> {
    await cleanupScheduleTestData({
        phoneHashes: Object.values(phones).map(phoneHash),
        appointmentIds: createdAppointmentIds,
    })
}

describe("Schedule integration tests (Postgres)", () => {
    beforeAll(async () => {
        await cleanup()
        savedScheduleConfig = await snapshotScheduleConfig()
        await useScheduleConfig({ settings: testSettings, ranges: testRanges })
        const created = await createTestQuestion()
        testQuestionId = created.questionId
        testCategoryId = created.categoryId
    })

    afterAll(async () => {
        try {
            await cleanup()
        } finally {
            try {
                if (savedScheduleConfig) {
                    await restoreScheduleConfig(savedScheduleConfig)
                }
            } finally {
                await getPool().end()
            }
        }
    })

    it("grava evento CREATED em AppointmentEvents e documents_sent como jsonb", async () => {
        const s = await sessionRepository.findOrCreateActive(phoneHash(phones.c1))
        createdSessionIds.push(s.id)

        const testSlot = parseLocalDate("2026-11-10", "09:00")

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

        const slotTime = parseLocalDate("2026-11-10", "08:00")

        const results = await Promise.allSettled([
            scheduleRepository.bookAppointment({
                sessionId: s1.id,
                questionId: testQuestionId,
                reason: "REQUIRES_IN_PERSON",
                name: "Concorrente 1",
                cpfHash: makeCpfHash("201"),
                cpfMasked: "***.201.201-**",
                phone: phones.c1_slot,
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
            (r): r is PromiseFulfilledResult<BookAppointmentResult> => r.status === "fulfilled",
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

        const slotTime = parseLocalDate("2026-11-10", "11:00")
        const testCpfHash = makeCpfHash("999")
        const appointmentsBefore = await countRows("Appointments")
        const appointmentEventsBefore = await countRows("AppointmentEvents")
        const conversationEventsBefore = await countRows("ConversationEvents")

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

        expect(await countRows("Appointments")).toBe(appointmentsBefore)
        expect(await countRows("AppointmentEvents")).toBe(appointmentEventsBefore)
        expect(await countRows("ConversationEvents")).toBe(conversationEventsBefore)
    })

    it("respeita estritamente o limite da janela de agendamento (window_days)", async () => {
        await useScheduleConfig({
            settings: { ...testSettings, window_days: 3, min_notice_days: 1 },
            ranges: testRanges,
            blockedDates: [],
        })

        const scheduleService = createScheduleService(scheduleRepository)
        const now = new Date("2026-10-05T09:00:00-03:00")
        const slots = await scheduleService.getAvailableSlots(now)

        expect(slots.length).toBeGreaterThan(0)
        const distinctDates = Array.from(new Set(slots.map((s) => s.dateStr)))
        expect(distinctDates).toEqual(["2026-10-06", "2026-10-07", "2026-10-08"])

        await useScheduleConfig({ settings: testSettings, ranges: testRanges })
    })

    it("a reserva pelo bot grava o motivo mostrado na oferta mesmo se a pergunta mudar antes do clique", async () => {
        const pool = getPool()
        const phone = phones.reasonFlow

        try {
            const first = await sendToBot(phone, "oi")
            await sendToBot(phone, undefined, `cat_${testCategoryId}`)
            const offer = await sendToBot(phone, undefined, `q_${testQuestionId}`)
            expect(offer.sessionId).toBe(first.sessionId)
            expect(offer.reply.step).toBe("AWAITING_SCHEDULE_OFFER")

            await pool.query("UPDATE Questions SET requires_in_person = false WHERE id = $1", [testQuestionId])

            await sendToBot(phone, undefined, "schedule_yes")
            await sendToBot(phone, undefined, "attendee_self")
            await sendToBot(phone, "Cidadã Fictícia do Motivo")
            const slots = await sendToBot(phone, "39053344705")
            expect(slots.reply.step).toBe("AWAITING_SLOT")
            const booked = await sendToBot(phone, undefined, firstSlotOptionId(slots))
            expect(booked.reply.step).toBe("FINISHED")

            const appointment = await pool.query<{ reason: string }>(
                "SELECT reason FROM Appointments WHERE session_id = $1",
                [first.sessionId],
            )
            const offered = await pool.query<{ data: { reason: string } }>(
                "SELECT data FROM ConversationEvents WHERE session_id = $1 AND type = 'SCHEDULE_OFFERED' ORDER BY created_at, id",
                [first.sessionId],
            )
            expect(appointment.rows).toEqual([{ reason: "REQUIRES_IN_PERSON" }])
            expect(offered.rows).toEqual([{ data: { reason: "REQUIRES_IN_PERSON" } }])
        } finally {
            await pool.query("UPDATE Questions SET requires_in_person = true WHERE id = $1", [testQuestionId])
        }
    })
})
