import { afterAll, beforeAll, describe, expect, it } from "vitest"
import getPool from "../../db/connection"
import AppointmentNotChangeableError from "../../errors/AppointmentNotChangeableError"
import SlotFullError from "../../errors/SlotFullError"
import DuplicateAppointmentError from "../../errors/DuplicateAppointmentError"
import { scheduleRepository } from "../../repositories/schedule.repository"
import { sessionRepository } from "../../repositories/session.repository"
import { scheduleService } from "../../services/schedule.service"
import { addDaysToDateString, getLocalParts, parseLocalDate } from "../../utils/date.utils"
import { loginAdmin } from "./helpers/appointmentsDb"
import { insertCitizenAppointment, storedCitizenAppointment } from "./helpers/citizenAppointmentDb"
import { hashPhone } from "./helpers/phone"
import {
    cleanupScheduleTestData,
    createTestQuestion,
    restoreScheduleConfig,
    ScheduleConfigSnapshot,
    snapshotScheduleConfig,
    useScheduleConfig,
} from "./helpers/scheduleDb"
import { deleteTestUsers, eventsOf } from "./helpers/usersDb"

const phones = {
    now: "5512999990591",
    inactive: "5512999990592",
    owner: "5512999990593",
    stranger: "5512999990594",
    confirmed: "5512999990595",
    cancelOwner: "5512999990596",
    cancelIntruder: "5512999990597",
    cancelNow: "5512999990598",
    cancelPast: "5512999990599",
    cancelCanceled: "5512999990600",
    cancelFinished: "5512999990601",
    cancelConfirmed: "5512999990602",
    cancelFreesSlot: "5512999990603",
    slotBlocker: "5512999990604",
    rescheduleOwner: "5512999990605",
    rescheduleIntruder: "5512999990606",
    rescheduleSlotFull: "5512999990607",
    slotFullBlocker: "5512999990608",
    rescheduleDuplicate: "5512999990609",
    rescheduleCanceled: "5512999990610",
    reschedulePast: "5512999990611",
    rescheduleFinished: "5512999990612",
    rescheduleConfirmed: "5512999990613",
    rescheduleResult: "5512999990614",
    reschedulePending: "5512999990615",
    rescheduleTwice: "5512999990616",
}

const HOUR = 60 * 60 * 1000

function nextTuesday(): string {
    let curr = addDaysToDateString(getLocalParts(new Date()).dateStr, 2)
    while (new Date(`${curr}T12:00:00Z`).getUTCDay() !== 2) {
        curr = addDaysToDateString(curr, 1)
    }
    return curr
}

async function useTuesdayMorning(seatsPerSlot: number): Promise<void> {
    await useScheduleConfig({
        settings: {
            slot_minutes: 30,
            seats_per_slot: seatsPerSlot,
            window_days: 30,
            min_notice_days: 1,
            wait_alert_days: 7,
            unit_address: "Rua do Procon, 100",
            unit_address_complement: "Sala 2",
            reminder_enabled: true,
            reminder_hours: 24,
        },
        ranges: [{ weekday: 2, slot_index: 1, start_time: "08:00", end_time: "12:00" }],
    })
}

describe("agendamento de retorno do cidadão (Postgres)", () => {
    const createdAppointmentIds: string[] = []
    const now = new Date(Math.floor(Date.now() / 1000) * 1000)
    let questionId: number
    let adminUserId: number
    let createdAdminId: number | null = null
    let appointmentCount = 0
    let savedSnapshot: ScheduleConfigSnapshot | null = null
    const tuesday = nextTuesday()

    beforeAll(async () => {
        await cleanupScheduleTestData({ phoneHashes: Object.values(phones).map(hashPhone), appointmentIds: [] })
        savedSnapshot = await snapshotScheduleConfig()
        questionId = (await createTestQuestion()).questionId
        const admin = await loginAdmin()
        adminUserId = admin.adminUserId
        createdAdminId = admin.createdAdminId
    })

    afterAll(async () => {
        await cleanupScheduleTestData({
            phoneHashes: Object.values(phones).map(hashPhone),
            appointmentIds: createdAppointmentIds,
        })
        await deleteTestUsers([createdAdminId])
        if (savedSnapshot) {
            await restoreScheduleConfig(savedSnapshot)
        }
        await getPool().end()
    })

    async function currentSessionOf(phone: string): Promise<string> {
        return (await sessionRepository.findOrCreateActive(hashPhone(phone))).id
    }

    async function citizenEventTypes(appointmentId: string): Promise<string[]> {
        return (await eventsOf([Number(appointmentId)])).map((event) => event.type)
    }

    async function sessionRow(sessionId: string) {
        const result = await getPool().query<{ status: string; outcome: string; draft: unknown }>(
            "SELECT status, outcome, draft FROM Sessions WHERE id = $1",
            [sessionId],
        )
        return result.rows[0]
    }

    async function finishedSessionOf(phone: string): Promise<string> {
        const sessionId = await currentSessionOf(phone)
        await getPool().query(
            `UPDATE Sessions
             SET status = 'FINISHED', outcome = 'RESOLVED', current_step = 'FINISHED', ended_at = now(), draft = NULL
             WHERE id = $1`,
            [sessionId],
        )
        return sessionId
    }

    async function conversationEventTypes(sessionId: string): Promise<string[]> {
        const result = await getPool().query<{ type: string }>(
            "SELECT type FROM ConversationEvents WHERE session_id = $1 ORDER BY id",
            [sessionId],
        )
        return result.rows.map((row) => row.type)
    }

    async function conversationEventsOf(sessionId: string) {
        const result = await getPool().query<{ type: string; appointment_id: string | null; data: unknown }>(
            "SELECT type, appointment_id, data FROM ConversationEvents WHERE session_id = $1 ORDER BY id",
            [sessionId],
        )
        return result.rows
    }

    async function appointmentFor(phone: string, input: Partial<Parameters<typeof insertCitizenAppointment>[0]> = {}) {
        appointmentCount += 1
        const id = await insertCitizenAppointment({
            phone,
            questionId,
            cpfHash: String(appointmentCount).padStart(64, "0"),
            appointmentDatetime: new Date(now.getTime() + 48 * HOUR),
            assignedUserId: adminUserId,
            ...input,
        })
        createdAppointmentIds.push(id)
        return id
    }

    describe("findReturningAppointment", () => {
        it("não devolve o agendamento Pendente marcado exatamente para agora", async () => {
            await appointmentFor(phones.now, { appointmentDatetime: now })

            const found = await scheduleRepository.findReturningAppointment(hashPhone(phones.now), now)

            expect(found).toBeNull()
        })

        it("não devolve agendamentos futuros Cancelados, Atendidos ou Não compareceu", async () => {
            await appointmentFor(phones.inactive, { status: "CANCELED", appointmentDatetime: new Date(now.getTime() + 24 * HOUR) })
            await appointmentFor(phones.inactive, { status: "ATTENDED", appointmentDatetime: new Date(now.getTime() + 25 * HOUR) })
            await appointmentFor(phones.inactive, { status: "NO_SHOW", appointmentDatetime: new Date(now.getTime() + 26 * HOUR) })

            const found = await scheduleRepository.findReturningAppointment(hashPhone(phones.inactive), now)

            expect(found).toBeNull()
        })

        it("não devolve o agendamento de outro telefone e devolve null para quem não tem nenhum", async () => {
            await appointmentFor(phones.owner)

            const stranger = await scheduleRepository.findReturningAppointment(hashPhone(phones.stranger), now)

            expect(stranger).toBeNull()
        })

        it("devolve o agendamento Confirmado futuro com id, horário e status", async () => {
            const appointmentDatetime = new Date(now.getTime() + 72 * HOUR)
            const id = await appointmentFor(phones.confirmed, { status: "CONFIRMED", appointmentDatetime })

            const found = await scheduleRepository.findReturningAppointment(hashPhone(phones.confirmed), now)

            expect(found).toEqual({ id, appointmentDatetime, status: "CONFIRMED" })
        })
    })

    describe("cancelByCitizen", () => {
        it("recusa com AppointmentNotChangeableError e não altera nada quando o agendamento é de outro telefone", async () => {
            const appointmentId = await appointmentFor(phones.cancelOwner)
            const sessionId = await currentSessionOf(phones.cancelIntruder)

            const attempt = scheduleRepository.cancelByCitizen({
                sessionId,
                appointmentId,
                phoneHash: hashPhone(phones.cancelIntruder),
                now,
            })

            await expect(attempt).rejects.toBeInstanceOf(AppointmentNotChangeableError)
            expect((await storedCitizenAppointment(appointmentId)).status).toBe("PENDING")
            expect(await citizenEventTypes(appointmentId)).toEqual([])
            expect(await sessionRow(sessionId)).toMatchObject({ status: "IN_PROGRESS", outcome: "IN_PROGRESS" })
        })

        it.each([
            ["o horário é igual a agora", phones.cancelNow, { appointmentDatetime: now }, "PENDING"],
            ["o horário já passou", phones.cancelPast, { appointmentDatetime: new Date(now.getTime() - HOUR) }, "PENDING"],
            ["a equipe já cancelou", phones.cancelCanceled, { status: "CANCELED" as const }, "CANCELED"],
        ])("recusa com AppointmentNotChangeableError quando %s", async (_caso, phone, input, statusAntes) => {
            const appointmentId = await appointmentFor(phone, input)
            const sessionId = await currentSessionOf(phone)

            const attempt = scheduleRepository.cancelByCitizen({ sessionId, appointmentId, phoneHash: hashPhone(phone), now })

            await expect(attempt).rejects.toBeInstanceOf(AppointmentNotChangeableError)
            expect((await storedCitizenAppointment(appointmentId)).status).toBe(statusAntes)
            expect(await citizenEventTypes(appointmentId)).toEqual([])
        })

        it("volta a transação inteira quando a sessão já terminou e o encerramento falha", async () => {
            const appointmentId = await appointmentFor(phones.cancelFinished)
            const sessionId = await finishedSessionOf(phones.cancelFinished)

            const attempt = scheduleRepository.cancelByCitizen({
                sessionId,
                appointmentId,
                phoneHash: hashPhone(phones.cancelFinished),
                now,
            })

            await expect(attempt).rejects.toThrow("Conversation session was changed or finished")
            expect((await storedCitizenAppointment(appointmentId)).status).toBe("PENDING")
            expect(await citizenEventTypes(appointmentId)).toEqual([])
            expect(await conversationEventTypes(sessionId)).not.toContain("APPOINTMENT_CANCELED")
        })

        it("cancela o Confirmado mantendo o responsável, grava o evento do cidadão e encerra a sessão como agendamento gerenciado", async () => {
            const appointmentId = await appointmentFor(phones.cancelConfirmed, { status: "CONFIRMED" })
            const sessionId = await currentSessionOf(phones.cancelConfirmed)
            const before = await storedCitizenAppointment(appointmentId)

            const result = await scheduleRepository.cancelByCitizen({
                sessionId,
                appointmentId,
                phoneHash: hashPhone(phones.cancelConfirmed),
                now,
            })

            expect(result).toEqual({ protocol: before.appointmentCode.slice(0, 8).toUpperCase() })
            expect(result.protocol).toHaveLength(8)
            expect(await storedCitizenAppointment(appointmentId)).toMatchObject({
                status: "CANCELED",
                assignedUserId: adminUserId,
            })
            const events = await eventsOf([Number(appointmentId)])
            expect(events.map(({ type, actorUserId, data }) => ({ type, actorUserId, data }))).toEqual([
                { type: "CANCELED_BY_CITIZEN", actorUserId: null, data: {} },
            ])
            expect(await sessionRow(sessionId)).toEqual({ status: "FINISHED", outcome: "MANAGED_APPOINTMENT", draft: null })
            const closing = (await conversationEventsOf(sessionId)).filter((event) => event.type !== "STARTED")
            expect(closing).toEqual([{ type: "APPOINTMENT_CANCELED", appointment_id: appointmentId, data: {} }])
        })

        it("libera o horário de vaga única para a lista do bot depois do cancelamento", async () => {
            await useTuesdayMorning(1)
            const slot = parseLocalDate(tuesday, "08:30")
            const appointmentId = await appointmentFor(phones.cancelFreesSlot, { appointmentDatetime: slot })
            const sessionId = await currentSessionOf(phones.cancelFreesSlot)
            const isListed = async () =>
                (await scheduleService.getAvailableSlots(now)).some((free) => free.datetime.getTime() === slot.getTime())
            expect(await isListed()).toBe(false)

            await scheduleRepository.cancelByCitizen({
                sessionId,
                appointmentId,
                phoneHash: hashPhone(phones.cancelFreesSlot),
                now,
            })

            expect(await isListed()).toBe(true)
        })
    })

    describe("rescheduleByCitizen", () => {
        it("recusa com AppointmentNotChangeableError, e não com SlotFullError, o agendamento de outro telefone num horário lotado", async () => {
            await useTuesdayMorning(1)
            const fullSlot = parseLocalDate(tuesday, "08:00")
            await appointmentFor(phones.slotBlocker, { appointmentDatetime: fullSlot })
            const appointmentId = await appointmentFor(phones.rescheduleOwner)
            const sessionId = await currentSessionOf(phones.rescheduleIntruder)

            const attempt = scheduleRepository.rescheduleByCitizen({
                sessionId,
                appointmentId,
                phoneHash: hashPhone(phones.rescheduleIntruder),
                appointmentDatetime: fullSlot,
                now,
            })

            await expect(attempt).rejects.toBeInstanceOf(AppointmentNotChangeableError)
        })

        it.each([
            ["fora da grade do novo dia", "07:00", false],
            ["lotado", "09:00", true],
        ])("recusa com SlotFullError um horário %s, sem alterar o agendamento", async (_caso, time, occupied) => {
            await useTuesdayMorning(1)
            if (occupied) {
                await appointmentFor(phones.slotFullBlocker, { appointmentDatetime: parseLocalDate(tuesday, time) })
            }
            const appointmentId = await appointmentFor(phones.rescheduleSlotFull)
            const sessionId = await currentSessionOf(phones.rescheduleSlotFull)
            const before = await storedCitizenAppointment(appointmentId)

            const attempt = scheduleRepository.rescheduleByCitizen({
                sessionId,
                appointmentId,
                phoneHash: hashPhone(phones.rescheduleSlotFull),
                appointmentDatetime: parseLocalDate(tuesday, time),
                now,
            })

            await expect(attempt).rejects.toBeInstanceOf(SlotFullError)
            expect(await storedCitizenAppointment(appointmentId)).toEqual(before)
            expect(await citizenEventTypes(appointmentId)).toEqual([])
        })

        it("recusa com DuplicateAppointmentError quando o mesmo CPF já tem outro agendamento ativo no novo horário", async () => {
            await useTuesdayMorning(2)
            const newSlot = parseLocalDate(tuesday, "09:30")
            const cpfHash = "d".repeat(64)
            const otherId = await insertCitizenAppointment({
                phone: phones.slotFullBlocker,
                questionId,
                cpfHash,
                appointmentDatetime: newSlot,
            })
            createdAppointmentIds.push(otherId)
            const appointmentId = await appointmentFor(phones.rescheduleDuplicate, { cpfHash })
            const sessionId = await currentSessionOf(phones.rescheduleDuplicate)
            const before = await storedCitizenAppointment(appointmentId)

            const attempt = scheduleRepository.rescheduleByCitizen({
                sessionId,
                appointmentId,
                phoneHash: hashPhone(phones.rescheduleDuplicate),
                appointmentDatetime: newSlot,
                now,
            })

            await expect(attempt).rejects.toBeInstanceOf(DuplicateAppointmentError)
            expect(await storedCitizenAppointment(appointmentId)).toEqual(before)
        })

        it.each([
            ["de outro telefone", phones.rescheduleOwner, phones.rescheduleIntruder, {}],
            ["já Cancelado", phones.rescheduleCanceled, phones.rescheduleCanceled, { status: "CANCELED" as const }],
            ["com horário igual a agora", phones.reschedulePast, phones.reschedulePast, { appointmentDatetime: now }],
        ])("recusa com AppointmentNotChangeableError um agendamento %s", async (_caso, owner, caller, input) => {
            await useTuesdayMorning(2)
            const appointmentId = await appointmentFor(owner, input)
            const sessionId = await currentSessionOf(caller)
            const before = await storedCitizenAppointment(appointmentId)

            const attempt = scheduleRepository.rescheduleByCitizen({
                sessionId,
                appointmentId,
                phoneHash: hashPhone(caller),
                appointmentDatetime: parseLocalDate(tuesday, "10:00"),
                now,
            })

            await expect(attempt).rejects.toBeInstanceOf(AppointmentNotChangeableError)
            expect(await storedCitizenAppointment(appointmentId)).toEqual(before)
        })

        it("volta a transação inteira quando a sessão já terminou e o encerramento falha", async () => {
            await useTuesdayMorning(2)
            const appointmentId = await appointmentFor(phones.rescheduleFinished, { status: "CONFIRMED" })
            const sessionId = await finishedSessionOf(phones.rescheduleFinished)
            const before = await storedCitizenAppointment(appointmentId)

            const attempt = scheduleRepository.rescheduleByCitizen({
                sessionId,
                appointmentId,
                phoneHash: hashPhone(phones.rescheduleFinished),
                appointmentDatetime: parseLocalDate(tuesday, "10:00"),
                now,
            })

            await expect(attempt).rejects.toThrow("Conversation session was changed or finished")
            expect(await storedCitizenAppointment(appointmentId)).toEqual(before)
            expect(await citizenEventTypes(appointmentId)).toEqual([])
        })

        it("remarca o Confirmado mantendo o protocolo e os dados, volta a Pendente sem responsável e encerra a sessão", async () => {
            await useTuesdayMorning(2)
            const original = new Date(now.getTime() + 30 * HOUR)
            const newSlot = parseLocalDate(tuesday, "10:30")
            const appointmentId = await appointmentFor(phones.rescheduleConfirmed, {
                status: "CONFIRMED",
                appointmentDatetime: original,
            })
            const sessionId = await currentSessionOf(phones.rescheduleConfirmed)
            const before = await storedCitizenAppointment(appointmentId)

            await scheduleRepository.rescheduleByCitizen({
                sessionId,
                appointmentId,
                phoneHash: hashPhone(phones.rescheduleConfirmed),
                appointmentDatetime: newSlot,
                now,
            })

            expect(await storedCitizenAppointment(appointmentId)).toEqual({
                ...before,
                appointmentDatetime: newSlot.toISOString(),
                rescheduledFrom: original.toISOString(),
                status: "PENDING",
                assignedUserId: null,
            })
            const events = await eventsOf([Number(appointmentId)])
            expect(events.map(({ type, actorUserId, data }) => ({ type, actorUserId, data }))).toEqual([
                {
                    type: "RESCHEDULED",
                    actorUserId: null,
                    data: { from: original.toISOString(), to: newSlot.toISOString() },
                },
                { type: "BACK_TO_PENDING", actorUserId: null, data: { reason: "RESCHEDULED" } },
            ])
            expect(await sessionRow(sessionId)).toEqual({ status: "FINISHED", outcome: "MANAGED_APPOINTMENT", draft: null })
            const closing = (await conversationEventsOf(sessionId)).filter((event) => event.type !== "STARTED")
            expect(closing).toEqual([
                {
                    type: "APPOINTMENT_RESCHEDULED",
                    appointment_id: appointmentId,
                    data: { from: original.toISOString(), to: newSlot.toISOString() },
                },
            ])
        })

        it("devolve o protocolo, os documentos guardados no agendamento e o endereço e o lembrete da agenda do novo dia", async () => {
            await useTuesdayMorning(2)
            const newSlot = parseLocalDate(tuesday, "11:00")
            const stored = { group: ["Documento guardado"], question: ["Contrato guardado"] }
            const appointmentId = await appointmentFor(phones.rescheduleResult, {
                documentsSent: stored,
                byRepresentative: true,
            })
            const sessionId = await currentSessionOf(phones.rescheduleResult)
            const before = await storedCitizenAppointment(appointmentId)
            const currentDocument = await getPool().query<{ id: string }>(
                "INSERT INTO AttendanceDocuments (attendee_group, description, position) VALUES ('REPRESENTATIVE', 'Documento atual da configuração', 0) RETURNING id",
            )

            try {
                const result = await scheduleRepository.rescheduleByCitizen({
                    sessionId,
                    appointmentId,
                    phoneHash: hashPhone(phones.rescheduleResult),
                    appointmentDatetime: newSlot,
                    now,
                })

                expect(result).toEqual({
                    protocol: before.appointmentCode.slice(0, 8).toUpperCase(),
                    from: new Date(before.appointmentDatetime),
                    appointmentDatetime: newSlot,
                    unitAddress: "Rua do Procon, 100",
                    unitAddressComplement: "Sala 2",
                    documentsSent: stored,
                    byRepresentative: true,
                    reminderEnabled: true,
                    reminderHours: 24,
                })
            } finally {
                await getPool().query("DELETE FROM AttendanceDocuments WHERE id = $1", [currentDocument.rows[0]!.id])
            }
        })

        it("não grava BACK_TO_PENDING ao remarcar um agendamento Pendente", async () => {
            await useTuesdayMorning(2)
            const appointmentId = await appointmentFor(phones.reschedulePending)
            const sessionId = await currentSessionOf(phones.reschedulePending)

            await scheduleRepository.rescheduleByCitizen({
                sessionId,
                appointmentId,
                phoneHash: hashPhone(phones.reschedulePending),
                appointmentDatetime: parseLocalDate(tuesday, "11:30"),
                now,
            })

            expect(await citizenEventTypes(appointmentId)).toEqual(["RESCHEDULED"])
            expect((await storedCitizenAppointment(appointmentId)).status).toBe("PENDING")
        })

        it("mantém em rescheduled_from o horário do primeiro agendamento ao remarcar de novo em outra sessão", async () => {
            await useTuesdayMorning(2)
            const original = new Date(now.getTime() + 36 * HOUR)
            const second = parseLocalDate(addDaysToDateString(tuesday, 7), "08:00")
            const third = parseLocalDate(addDaysToDateString(tuesday, 7), "08:30")
            const appointmentId = await appointmentFor(phones.rescheduleTwice, { appointmentDatetime: original })
            const phoneHash = hashPhone(phones.rescheduleTwice)
            await scheduleRepository.rescheduleByCitizen({
                sessionId: await currentSessionOf(phones.rescheduleTwice),
                appointmentId,
                phoneHash,
                appointmentDatetime: second,
                now,
            })

            await scheduleRepository.rescheduleByCitizen({
                sessionId: await currentSessionOf(phones.rescheduleTwice),
                appointmentId,
                phoneHash,
                appointmentDatetime: third,
                now,
            })

            expect(await storedCitizenAppointment(appointmentId)).toMatchObject({
                appointmentDatetime: third.toISOString(),
                rescheduledFrom: original.toISOString(),
            })
            const rescheduled = (await eventsOf([Number(appointmentId)])).filter((event) => event.type === "RESCHEDULED")
            expect(rescheduled.map((event) => event.data)).toEqual([
                { from: original.toISOString(), to: second.toISOString() },
                { from: second.toISOString(), to: third.toISOString() },
            ])
        })
    })
})
