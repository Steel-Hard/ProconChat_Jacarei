import { randomBytes } from "node:crypto"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import getPool from "../../db/connection"
import SlotFullError from "../../errors/SlotFullError"
import { createAppointmentRepository } from "../../repositories/appointment.repository"
import { scheduleRepository } from "../../repositories/schedule.repository"
import { sessionRepository } from "../../repositories/session.repository"
import type { AppointmentStatus } from "../../types/appointment.types"
import type { Permission } from "../../types/auth.types"
import { encrypt } from "../../utils/crypto.utils"
import { parseLocalDate } from "../../utils/date.utils"
import {
    createAppointmentScope,
    createTestAppointment,
    deleteAppointmentScope,
    firstRow,
    OwnedAppointmentScope,
} from "./helpers/appointmentsDb"
import { hashPhone } from "./helpers/phone"
import {
    restoreScheduleConfig,
    ScheduleConfigSnapshot,
    snapshotScheduleConfig,
    useScheduleConfig,
} from "./helpers/scheduleDb"
import { appointmentState, createTestUser, deleteTestUsers, eventsOf, TestUser } from "./helpers/usersDb"

const NOW = new Date("2031-01-10T12:00:00.000Z")
const MANAGE: Permission[] = ["appointments.view", "appointments.manage"]
const repository = createAppointmentRepository()
const BOOKING_PHONE = "5512999990671"
const ROUNDS = 5

async function lockWaiters(): Promise<number> {
    const result = await getPool().query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM pg_stat_activity
         WHERE datname = current_database() AND wait_event_type = 'Lock'`,
    )
    return result.rows[0]?.count ?? 0
}

async function waitForLockWaiters(count: number): Promise<void> {
    const deadline = Date.now() + 5_000
    while ((await lockWaiters()) < count) {
        if (Date.now() > deadline) {
            throw new Error(`Esperava ${count} transações aguardando trava`)
        }
        await new Promise((resolve) => setTimeout(resolve, 10))
    }
}

function settle<T>(promise: Promise<T>): Promise<PromiseSettledResult<T>> {
    return promise.then(
        (value): PromiseSettledResult<T> => ({ status: "fulfilled", value }),
        (reason: unknown): PromiseSettledResult<T> => ({ status: "rejected", reason }),
    )
}

async function raceOnBlockedAppointment(
    appointmentId: number,
    first: () => Promise<void>,
    second: () => Promise<void>,
): Promise<PromiseSettledResult<void>[]> {
    const blocker = await getPool().connect()
    try {
        await blocker.query("BEGIN")
        await blocker.query("SELECT id FROM Appointments WHERE id = $1 FOR UPDATE", [appointmentId])
        const firstResult = settle(first())
        await waitForLockWaiters(1)
        const secondResult = settle(second())
        await waitForLockWaiters(2)
        await blocker.query("COMMIT")
        return [await firstResult, await secondResult]
    } finally {
        blocker.release()
    }
}

async function notesOf(appointmentId: number): Promise<{ authorUserId: number; text: string }[]> {
    const result = await getPool().query<{ author_user_id: string; text: string }>(
        "SELECT author_user_id, text FROM AppointmentNotes WHERE appointment_id = $1 ORDER BY id",
        [appointmentId],
    )
    return result.rows.map((row) => ({ authorUserId: Number(row.author_user_id), text: row.text }))
}

async function insertEvent(
    appointmentId: number,
    type: string,
    data: Record<string, unknown>,
    createdAt: Date,
): Promise<void> {
    await getPool().query(
        `INSERT INTO AppointmentEvents (appointment_id, type, data, created_at)
         VALUES ($1, $2::appointment_event_type, $3::jsonb, $4)`,
        [appointmentId, type, JSON.stringify(data), createdAt],
    )
}

async function countEvents(appointmentId: number, type?: string): Promise<number> {
    const result = await getPool().query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM AppointmentEvents
         WHERE appointment_id = $1 AND ($2::text IS NULL OR type::text = $2)`,
        [appointmentId, type ?? null],
    )
    return result.rows[0]?.count ?? 0
}

describe("Cancelamento pela equipe com Postgres", () => {
    const createdUserIds: (number | null)[] = []
    let admin: TestUser
    let staff: TestUser
    let scope: OwnedAppointmentScope
    let day = 0
    let savedScheduleConfig: ScheduleConfigSnapshot | null = null
    const bookingSessionIds: string[] = []

    async function appointment(
        status: AppointmentStatus,
        appointmentDatetime: Date = new Date(Date.UTC(2031, 5, ++day, 16)),
        assignedUserId: number | null = null,
    ): Promise<number> {
        return createTestAppointment(scope, {
            status,
            assignedUserId,
            appointmentDatetime,
            cpfHash: randomBytes(32).toString("hex"),
        })
    }

    beforeAll(async () => {
        admin = await createTestUser({ isAdmin: true })
        createdUserIds.push(admin.createdId)
        staff = await createTestUser({ name: "Equipe Cancela", permissions: MANAGE })
        createdUserIds.push(staff.createdId)
        scope = await createAppointmentScope(admin.id, "cancel")
    })

    afterAll(async () => {
        try {
            const pool = getPool()
            await pool.query("DELETE FROM ConversationEvents WHERE session_id = ANY($1::bigint[])", [bookingSessionIds])
            await deleteAppointmentScope(scope)
            await pool.query("DELETE FROM Sessions WHERE id = ANY($1::bigint[])", [bookingSessionIds])
            await deleteTestUsers(createdUserIds)
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

    it("recusa cancelar no horário exato com CANCEL_AFTER_START e não muda nada", async () => {
        const id = await appointment("CONFIRMED", NOW, staff.id)
        const eventsBefore = await countEvents(id)

        await expect(repository.cancel(String(id), staff.id, "UNIT_CLOSED", undefined, NOW)).rejects.toMatchObject({
            statusCode: 409,
            code: "CANCEL_AFTER_START",
        })

        expect(await appointmentState(id)).toEqual({ status: "CONFIRMED", assignedUserId: staff.id })
        expect(await countEvents(id)).toBe(eventsBefore)
    })

    it("cancela um agendamento futuro, mantém o responsável e grava um único CANCELED_BY_STAFF com o motivo e o ator", async () => {
        const id = await appointment("CONFIRMED", undefined, admin.id)

        await repository.cancel(String(id), staff.id, "UNIT_CLOSED", undefined, NOW)

        expect(await appointmentState(id)).toEqual({ status: "CANCELED", assignedUserId: admin.id })
        const canceled = (await eventsOf([id])).filter((event) => event.type === "CANCELED_BY_STAFF")
        expect(canceled).toEqual([
            expect.objectContaining({ type: "CANCELED_BY_STAFF", actorUserId: staff.id, data: { reason: "UNIT_CLOSED" } }),
        ])
    })

    it("grava a observação com o texto e o autor quando vem nota, e nenhuma quando não vem", async () => {
        const withNote = await appointment("PENDING")
        const withoutNote = await appointment("PENDING")

        await repository.cancel(String(withNote), staff.id, "DUPLICATE", "Agendamento repetido", NOW)
        await repository.cancel(String(withoutNote), staff.id, "DUPLICATE", undefined, NOW)

        expect(await notesOf(withNote)).toEqual([{ authorUserId: staff.id, text: "Agendamento repetido" }])
        expect(await notesOf(withoutNote)).toEqual([])
    })

    it("desfaz o status e o evento quando a gravação da observação falha", async () => {
        const id = await appointment("CONFIRMED", undefined, staff.id)
        const eventsBefore = await countEvents(id)

        await expect(repository.cancel(String(id), staff.id, "OTHER", "   ", NOW)).rejects.toMatchObject({
            table: "appointmentnotes",
            constraint: "chk_appointment_notes_text",
        })

        expect(await appointmentState(id)).toEqual({ status: "CONFIRMED", assignedUserId: staff.id })
        expect(await countEvents(id)).toBe(eventsBefore)
        expect(await countEvents(id, "CANCELED_BY_STAFF")).toBe(0)
        expect(await notesOf(id)).toEqual([])
    })

    it("libera a única vaga do horário: depois de cancelar, uma nova reserva no mesmo horário é aceita", async () => {
        savedScheduleConfig = await snapshotScheduleConfig()
        await useScheduleConfig({
            settings: {
                slot_minutes: 30,
                seats_per_slot: 1,
                window_days: 7,
                min_notice_days: 1,
                wait_alert_days: 7,
                unit_address: "Rua do Procon, 100",
                unit_address_complement: null,
                reminder_enabled: false,
                reminder_hours: 24,
            },
            ranges: [{ weekday: 3, slot_index: 1, start_time: "08:00", end_time: "12:00" }],
        })
        const slot = parseLocalDate("2031-03-12", "09:00")
        const occupied = await appointment("PENDING", slot)
        const session = await sessionRepository.findOrCreateActive(hashPhone(BOOKING_PHONE))
        bookingSessionIds.push(session.id)
        const booking = {
            sessionId: session.id,
            questionId: scope.questionId,
            reason: "NOT_RESOLVED" as const,
            name: "Nova Reserva",
            cpfHash: randomBytes(32).toString("hex"),
            cpfMasked: "***.123.456-**",
            byRepresentative: false,
            appointmentDatetime: slot,
        }
        await expect(scheduleRepository.bookAppointment(booking)).rejects.toBeInstanceOf(SlotFullError)

        await repository.cancel(String(occupied), staff.id, "UNIT_CLOSED", undefined, NOW)
        const booked = await scheduleRepository.bookAppointment(booking)
        scope.createdAppointmentIds.push(Number(booked.id))

        expect(await appointmentState(Number(booked.id))).toEqual({ status: "PENDING", assignedUserId: null })
    })

    it("dois cancelamentos ao mesmo tempo: um vence, o outro recebe 409 APPOINTMENT_CANCELED e fica um único CANCELED_BY_STAFF", async () => {
        const other = await createTestUser({ name: "Equipe Cancela Dois", permissions: MANAGE })
        createdUserIds.push(other.createdId)

        for (let round = 0; round < ROUNDS; round += 1) {
            const id = await appointment("PENDING")

            const results = await raceOnBlockedAppointment(
                id,
                () => repository.cancel(String(id), staff.id, "UNIT_CLOSED", undefined, NOW),
                () => repository.cancel(String(id), other.id, "DUPLICATE", undefined, NOW),
            )

            expect(results[0]).toEqual({ status: "fulfilled", value: undefined })
            expect(results[1]).toMatchObject({ status: "rejected", reason: { statusCode: 409, code: "APPOINTMENT_CANCELED" } })
            expect(await countEvents(id, "CANCELED_BY_STAFF")).toBe(1)
        }
    })

    it("cancelar e assumir ao mesmo tempo: o cancelamento vence e assumir recebe 409 APPOINTMENT_CANCELED, sem deadlock", async () => {
        const claimer = await createTestUser({ name: "Equipe Assume", permissions: MANAGE })
        createdUserIds.push(claimer.createdId)

        for (let round = 0; round < ROUNDS; round += 1) {
            const id = await appointment("PENDING")

            const results = await raceOnBlockedAppointment(
                id,
                () => repository.cancel(String(id), staff.id, "UNIT_CLOSED", undefined, NOW),
                () => repository.claim(String(id), claimer.id, NOW),
            )

            expect(results[0]).toEqual({ status: "fulfilled", value: undefined })
            expect(results[1]).toMatchObject({ status: "rejected", reason: { statusCode: 409, code: "APPOINTMENT_CANCELED" } })
            expect(await appointmentState(id)).toEqual({ status: "CANCELED", assignedUserId: null })
            expect(await countEvents(id, "CLAIMED")).toBe(0)
        }
    })

    it("assumir e cancelar ao mesmo tempo com o assumir primeiro: as duas passam e o cancelado mantém quem assumiu, sem deadlock", async () => {
        const claimer = await createTestUser({ name: "Equipe Assume Primeiro", permissions: MANAGE })
        createdUserIds.push(claimer.createdId)

        for (let round = 0; round < ROUNDS; round += 1) {
            const id = await appointment("PENDING")

            const results = await raceOnBlockedAppointment(
                id,
                () => repository.claim(String(id), claimer.id, NOW),
                () => repository.cancel(String(id), staff.id, "UNIT_CLOSED", undefined, NOW),
            )

            expect(results).toEqual([
                { status: "fulfilled", value: undefined },
                { status: "fulfilled", value: undefined },
            ])
            expect(await appointmentState(id)).toEqual({ status: "CANCELED", assignedUserId: claimer.id })
            expect(await countEvents(id, "CLAIMED")).toBe(1)
            expect(await countEvents(id, "CANCELED_BY_STAFF")).toBe(1)
        }
    })

    it("lê o alvo do aviso com o aviso de cancelamento mais recente, ignorando outro kind e desempatando por id", async () => {
        const datetime = new Date(Date.UTC(2031, 8, 3, 17, 0))
        const id = await appointment("CANCELED", datetime)
        const phoneEncrypted = encrypt("5512999990672")
        await getPool().query("UPDATE Appointments SET name = $2, phone_encrypted = $3 WHERE id = $1", [
            id,
            "Maria da Silva",
            phoneEncrypted,
        ])
        const sameInstant = new Date("2031-01-10T12:05:00.000Z")
        await insertEvent(id, "CANCELED_BY_STAFF", { reason: "DUPLICATE" }, new Date("2031-01-10T12:00:00.000Z"))
        await insertEvent(id, "CITIZEN_NOTIFIED", { kind: "CANCELLATION" }, sameInstant)
        await insertEvent(id, "CITIZEN_NOTIFICATION_FAILED", { kind: "CANCELLATION" }, sameInstant)
        await insertEvent(id, "CITIZEN_NOTIFIED", { kind: "REMINDER" }, new Date("2031-01-10T13:00:00.000Z"))
        const code = firstRow(
            (await getPool().query<{ protocol: string }>(
                "SELECT UPPER(SUBSTRING(appointment_code::text, 1, 8)) AS protocol FROM Appointments WHERE id = $1",
                [id],
            )).rows,
        )

        const target = await repository.findCancellationNoticeTarget(String(id))

        expect(target).toEqual({
            status: "CANCELED",
            appointmentDatetime: datetime,
            name: "Maria da Silva",
            protocol: code.protocol,
            phoneEncrypted,
            lastStaffCancelReason: "DUPLICATE",
            lastCancellationNotice: "FAILED",
        })
    })

    it("lê o alvo sem aviso nem cancelamento pela equipe com os campos nulos, e devolve null para id inexistente", async () => {
        const id = await appointment("PENDING")

        const target = await repository.findCancellationNoticeTarget(String(id))

        expect(target).toMatchObject({ status: "PENDING", phoneEncrypted: null, lastStaffCancelReason: null, lastCancellationNotice: null })
        expect(await repository.findCancellationNoticeTarget("999999999999")).toBeNull()
    })

    it("grava o resultado do aviso como CITIZEN_NOTIFIED ou CITIZEN_NOTIFICATION_FAILED com o kind e o ator", async () => {
        const id = await appointment("PENDING")
        await repository.cancel(String(id), staff.id, "OTHER", undefined, NOW)

        await repository.recordCitizenNotification(String(id), "FAILED", "CANCELLATION", staff.id, NOW)
        await repository.recordCitizenNotification(String(id), "NOTIFIED", "CANCELLATION", admin.id, NOW)

        const notices = (await eventsOf([id])).filter((event) => event.type.startsWith("CITIZEN_"))
        expect(notices).toEqual([
            { appointmentId: id, type: "CITIZEN_NOTIFICATION_FAILED", actorUserId: staff.id, data: { kind: "CANCELLATION" }, createdAt: NOW.toISOString() },
            { appointmentId: id, type: "CITIZEN_NOTIFIED", actorUserId: admin.id, data: { kind: "CANCELLATION" }, createdAt: NOW.toISOString() },
        ])
        expect((await repository.findCancellationNoticeTarget(String(id)))?.lastCancellationNotice).toBe("NOTIFIED")
    })
})
