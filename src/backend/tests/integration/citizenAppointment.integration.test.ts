import { afterAll, beforeAll, describe, expect, it } from "vitest"
import getPool from "../../db/connection"
import AppointmentNotChangeableError from "../../errors/AppointmentNotChangeableError"
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
        ranges: [{ weekday: 2, slot_index: 1, start_time: "08:00", end_time: "10:00" }],
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
})
