import { randomBytes } from "node:crypto"
import type { PoolClient } from "pg"
import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import app from "../../app"
import getPool from "../../db/connection"
import SlotFullError from "../../errors/SlotFullError"
import { createAppointmentRepository } from "../../repositories/appointment.repository"
import { scheduleRepository } from "../../repositories/schedule.repository"
import { sessionRepository } from "../../repositories/session.repository"
import type { Permission } from "../../types/auth.types"
import { NormalizedScheduleConfig } from "../../types/schedule.types"
import { addDaysToDateString, getLocalParts, parseLocalDate } from "../../utils/date.utils"
import {
    createAppointmentScope,
    createTestAppointment,
    deleteAppointmentScope,
    OwnedAppointmentScope,
} from "./helpers/appointmentsDb"
import { hashPhone } from "./helpers/phone"
import {
    cleanupScheduleTestData,
    createTestQuestion,
    insertScheduleChange,
    restoreScheduleConfig,
    ScheduleConfigSnapshot,
    snapshotScheduleConfig,
    useScheduleConfig,
} from "./helpers/scheduleDb"
import { appointmentState, createTestUser, deleteTestUsers, TestUser } from "./helpers/usersDb"

const ORIGIN = process.env.FRONTEND_ORIGIN as string
const ROUNDS = 5
const BOOKING_PHONE = "5512988881341"
const CONFIGURE_AND_MANAGE: Permission[] = ["schedule.configure", "appointments.view", "appointments.manage"]
const appointments = createAppointmentRepository()

function nextMondayFrom(dateStr: string): string {
    let curr = dateStr
    while (new Date(`${curr}T12:00:00Z`).getUTCDay() !== 1) {
        curr = addDaysToDateString(curr, 1)
    }
    return curr
}

function configOn(weekdays: number[]): NormalizedScheduleConfig {
    return {
        slotMinutes: 30,
        seatsPerSlot: 2,
        windowDays: 30,
        minNoticeDays: 0,
        waitAlertDays: 7,
        unitAddress: "Rua do Procon, 100",
        unitAddressComplement: null,
        reminderEnabled: true,
        reminderHours: 24,
        ranges: weekdays.map((weekday) => ({ weekday, slotIndex: 1, startTime: "08:00", endTime: "12:00" })),
        blockedDates: [],
    }
}

function bodyOf(config: NormalizedScheduleConfig) {
    return {
        ...config,
        ranges: config.ranges.map(({ weekday, startTime, endTime }) => ({ weekday, startTime, endTime })),
    }
}

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

function dayMonthOf(date: string): string {
    return `${date.slice(8, 10)}/${date.slice(5, 7)}`
}

function holiday(date: string) {
    return { date, startTime: null, endTime: null, description: "Feriado" }
}

function settled<T>(promise: Promise<T>): Promise<PromiseSettledResult<T>> {
    return promise.then(
        (value): PromiseSettledResult<T> => ({ status: "fulfilled", value }),
        (reason: unknown): PromiseSettledResult<T> => ({ status: "rejected", reason }),
    )
}

describe("corrida entre mudança agendada, reserva e atribuição (Postgres)", () => {
    const createdUserIds: (number | null)[] = []
    let savedSnapshot: ScheduleConfigSnapshot | null = null
    let scope: OwnedAppointmentScope
    let configurer: TestUser
    let manager: TestUser
    let questionId: number
    let changeDate: string
    let tuesdayAfter: string

    async function user(input: Parameters<typeof createTestUser>[0]): Promise<TestUser> {
        const created = await createTestUser(input)
        createdUserIds.push(created.createdId)
        return created
    }

    function putVersion(config: NormalizedScheduleConfig): Promise<request.Response> {
        return request(app)
            .put(`/api/v1/schedule/versions/${changeDate}`)
            .set("Cookie", configurer.cookie)
            .set("Origin", ORIGIN)
            .send(bodyOf(config))
            .then((response) => response)
    }

    async function resetRound(): Promise<void> {
        const pool = getPool()
        const sessions = await pool.query<{ id: string }>("SELECT id FROM Sessions WHERE phone_hash = $1", [
            hashPhone(BOOKING_PHONE),
        ])
        const sessionIds = sessions.rows.map((row) => row.id)
        await pool.query(
            "DELETE FROM AppointmentEvents WHERE appointment_id IN (SELECT id FROM Appointments WHERE session_id = ANY($1::bigint[]))",
            [sessionIds],
        )
        await pool.query("DELETE FROM ConversationEvents WHERE session_id = ANY($1::bigint[])", [sessionIds])
        await pool.query("DELETE FROM Appointments WHERE session_id = ANY($1::bigint[])", [sessionIds])
        await pool.query("DELETE FROM Sessions WHERE id = ANY($1::bigint[])", [sessionIds])
        await pool.query("DELETE FROM ScheduleChanges")
    }

    async function bookingInput() {
        const session = await sessionRepository.findOrCreateActive(hashPhone(BOOKING_PHONE))
        return {
            sessionId: session.id,
            questionId,
            reason: "REQUIRES_IN_PERSON" as const,
            name: "Cidadão Corrida Mudança",
            cpfHash: "8".repeat(64),
            cpfMasked: "***.888.888-**",
            phone: BOOKING_PHONE,
            byRepresentative: false,
            appointmentDatetime: parseLocalDate(tuesdayAfter, "09:00"),
        }
    }

    async function bookedOnTuesday(): Promise<number> {
        const result = await getPool().query(
            "SELECT 1 FROM Appointments WHERE appointment_datetime = $1 AND status IN ('PENDING', 'CONFIRMED')",
            [parseLocalDate(tuesdayAfter, "09:00")],
        )
        return result.rowCount ?? 0
    }

    async function savedChanges(): Promise<number> {
        const result = await getPool().query("SELECT 1 FROM ScheduleChanges")
        return result.rowCount ?? 0
    }

    async function saveWhileChangeIsCommitted(
        writtenChange: string,
        saving: () => Promise<request.Response>,
    ): Promise<request.Response> {
        const writer: PoolClient = await getPool().connect()
        let pending: Promise<PromiseSettledResult<request.Response>> | null = null
        let committed = false
        try {
            await writer.query("BEGIN")
            await writer.query("SELECT pg_advisory_xact_lock(hashtext('schedule_config'))")
            await writer.query(
                `INSERT INTO ScheduleChanges (effective_from, config, updated_by)
                 VALUES ($1, $2::jsonb, $3)`,
                [writtenChange, JSON.stringify(configOn([1, 2, 3, 4, 5])), configurer.id],
            )
            pending = settled(saving())
            await waitForLockWaiters(1)
            await writer.query("COMMIT")
            committed = true
        } finally {
            if (!committed) {
                await writer.query("ROLLBACK")
            }
            writer.release()
        }
        const result = await pending
        if (result.status === "rejected") {
            throw result.reason
        }
        return result.value
    }

    function deleteVersion(): Promise<request.Response> {
        return request(app)
            .delete(`/api/v1/schedule/versions/${changeDate}`)
            .set("Cookie", configurer.cookie)
            .set("Origin", ORIGIN)
            .then((response) => response)
    }

    async function startRoundWithTuesdayOnlyInChange(): Promise<void> {
        await useScheduleConfig({
            settings: {
                slot_minutes: 30,
                seats_per_slot: 2,
                window_days: 30,
                min_notice_days: 0,
                wait_alert_days: 7,
                unit_address: "Rua do Procon, 100",
                unit_address_complement: null,
                reminder_enabled: true,
                reminder_hours: 24,
            },
            ranges: [1, 3, 4, 5].map((weekday) => ({
                weekday,
                slot_index: 1,
                start_time: "08:00",
                end_time: "12:00",
            })),
        })
        await resetRound()
        await insertScheduleChange(changeDate, configOn([1, 2, 3, 4, 5]), configurer.id)
    }

    async function blockedOn(date: string): Promise<number> {
        const result = await getPool().query("SELECT 1 FROM BlockedDates WHERE date = $1", [date])
        return result.rowCount ?? 0
    }

    async function changesOn(date: string): Promise<number> {
        const result = await getPool().query("SELECT 1 FROM ScheduleChanges WHERE effective_from = $1", [date])
        return result.rowCount ?? 0
    }

    beforeAll(async () => {
        savedSnapshot = await snapshotScheduleConfig()
        configurer = await user({ permissions: CONFIGURE_AND_MANAGE })
        manager = await user({ permissions: CONFIGURE_AND_MANAGE })
        const admin = await user({ isAdmin: true })
        scope = await createAppointmentScope(admin.id, "schedule_changes_race")
        questionId = (await createTestQuestion()).questionId
        changeDate = nextMondayFrom(addDaysToDateString(getLocalParts(new Date()).dateStr, 9))
        tuesdayAfter = addDaysToDateString(changeDate, 1)
    })

    beforeEach(async () => {
        await useScheduleConfig({
            settings: {
                slot_minutes: 30,
                seats_per_slot: 2,
                window_days: 30,
                min_notice_days: 0,
                wait_alert_days: 7,
                unit_address: "Rua do Procon, 100",
                unit_address_complement: null,
                reminder_enabled: true,
                reminder_hours: 24,
            },
            ranges: [1, 2, 3, 4, 5].map((weekday) => ({
                weekday,
                slot_index: 1,
                start_time: "08:00",
                end_time: "12:00",
            })),
        })
        await resetRound()
    })

    afterAll(async () => {
        try {
            await resetRound()
            await cleanupScheduleTestData({ phoneHashes: [hashPhone(BOOKING_PHONE)], appointmentIds: [] })
            await deleteAppointmentScope(scope)
            if (savedSnapshot) {
                await restoreScheduleConfig(savedSnapshot)
            }
            await deleteTestUsers(createdUserIds)
        } finally {
            await getPool().end()
        }
    })

    it("o salvamento que tira a terça espera a reserva em andamento e responde 409, sem gravar a mudança", async () => {
        for (let round = 0; round < ROUNDS; round += 1) {
            await resetRound()
            const input = await bookingInput()
            const booking: PoolClient = await getPool().connect()
            let saving: Promise<PromiseSettledResult<request.Response>> | null = null
            let committed = false
            try {
                await booking.query("BEGIN")
                await booking.query("SELECT pg_advisory_xact_lock_shared(hashtext('schedule_config'))")
                await booking.query(
                    `INSERT INTO Appointments (session_id, question_id, reason, name, cpf_hash, cpf_masked,
                                               by_representative, documents_sent, appointment_datetime, status)
                     VALUES ($1, $2, $3, $4, $5, $6, false, '{"group": [], "question": []}'::jsonb, $7, 'PENDING')`,
                    [input.sessionId, questionId, input.reason, input.name, input.cpfHash, input.cpfMasked, input.appointmentDatetime],
                )
                saving = settled(putVersion(configOn([1, 3, 4, 5])))
                await waitForLockWaiters(1)
                await booking.query("COMMIT")
                committed = true
            } finally {
                if (!committed) {
                    await booking.query("ROLLBACK")
                }
                booking.release()
            }
            const result = await saving

            expect(result.status === "fulfilled" && result.value.status).toBe(409)
            expect(await savedChanges()).toBe(0)
            expect(await bookedOnTuesday()).toBe(1)
        }
    })

    it("nunca deixa passar ao mesmo tempo a reserva da terça e a mudança que tira a terça", async () => {
        for (let round = 0; round < ROUNDS; round += 1) {
            await resetRound()
            const input = await bookingInput()

            const [booking, saving] = await Promise.all([
                settled(scheduleRepository.bookAppointment(input)),
                settled(putVersion(configOn([1, 3, 4, 5]))),
            ])

            const booked = booking.status === "fulfilled"
            const saved = saving.status === "fulfilled" && saving.value.status === 200
            expect(booked && saved).toBe(false)
            if (!booked) {
                expect(booking.reason).toBeInstanceOf(SlotFullError)
            }
            if (!saved) {
                expect(saving.status === "fulfilled" && saving.value.status).toBe(409)
            }
            expect([await bookedOnTuesday(), await savedChanges()]).toEqual([booked ? 1 : 0, saved ? 1 : 0])
        }
    })

    it("salva a mudança enquanto outra pessoa atribui a quem salva um agendamento da vigência, sem deadlock", async () => {
        const id = await createTestAppointment(scope, {
            status: "PENDING",
            appointmentDatetime: parseLocalDate(changeDate, "09:00"),
            cpfHash: randomBytes(32).toString("hex"),
        })

        for (let round = 0; round < ROUNDS; round += 1) {
            await getPool().query("DELETE FROM ScheduleChanges")
            await getPool().query("UPDATE Appointments SET status = 'PENDING', assigned_user_id = NULL WHERE id = $1", [id])
            const blocker = await getPool().connect()
            let results: [PromiseSettledResult<request.Response>, PromiseSettledResult<void>]
            let committed = false
            try {
                await blocker.query("BEGIN")
                await blocker.query("SELECT id FROM Appointments WHERE id = $1 FOR UPDATE", [id])
                const saving = settled(putVersion(configOn([1, 2, 3, 4, 5])))
                await waitForLockWaiters(1)
                const assigning = settled(appointments.assign(String(id), configurer.id, manager.id, new Date()))
                await waitForLockWaiters(2)
                await blocker.query("COMMIT")
                committed = true
                results = [await saving, await assigning]
            } finally {
                if (!committed) {
                    await blocker.query("ROLLBACK")
                }
                blocker.release()
            }

            for (const result of results) {
                if (result.status === "rejected") {
                    expect(result.reason).not.toMatchObject({ code: "40P01" })
                }
            }
            expect(results.map((result) => result.status)).toEqual(["fulfilled", "fulfilled"])
            expect(results[0].status === "fulfilled" && results[0].value.status).toBe(200)
            expect(await appointmentState(id)).toEqual({ status: "CONFIRMED", assignedUserId: configurer.id })
        }
    })

    it("recusa em PUT /schedule o bloqueio novo que passou a seguir a mudança gravada enquanto o salvamento esperava a trava", async () => {
        const today = getLocalParts(new Date()).dateStr
        const lateBlock = addDaysToDateString(changeDate, 3)
        const body = bodyOf({
            ...configOn([1, 2, 3, 4, 5]),
            blockedDates: [holiday(lateBlock), holiday(addDaysToDateString(today, 1))],
        })

        for (let round = 0; round < ROUNDS; round += 1) {
            await resetRound()

            const response = await saveWhileChangeIsCommitted(changeDate, () =>
                request(app).put("/api/v1/schedule").set("Cookie", configurer.cookie).set("Origin", ORIGIN).send(body),
            )

            expect(response.status).toBe(400)
            expect(response.body.error.details).toEqual({
                issues: [
                    { path: "blockedDates.0.date", message: `Esta data segue a mudança de ${dayMonthOf(changeDate)}. Bloqueie lá.` },
                ],
            })
            expect(await blockedOn(lateBlock)).toBe(0)
        }
    })

    it("recusa em PUT /versions o bloqueio novo que passou a seguir a mudança posterior gravada enquanto o salvamento esperava a trava", async () => {
        const laterChange = addDaysToDateString(changeDate, 7)
        const lateBlock = addDaysToDateString(laterChange, 2)
        const config = {
            ...configOn([1, 2, 3, 4, 5]),
            blockedDates: [holiday(lateBlock), holiday(addDaysToDateString(changeDate, 2))],
        }

        for (let round = 0; round < ROUNDS; round += 1) {
            await resetRound()

            const response = await saveWhileChangeIsCommitted(laterChange, () => putVersion(config))

            expect(response.status).toBe(400)
            expect(response.body.error.details).toEqual({
                issues: [
                    { path: "blockedDates.0.date", message: `Esta data segue a mudança de ${dayMonthOf(laterChange)}. Bloqueie lá.` },
                ],
            })
            expect(await changesOn(changeDate)).toBe(0)
        }
    })

    it("o cancelamento que devolveria a terça à grade sem ela espera a reserva em andamento e responde 409, mantendo a mudança", async () => {
        for (let round = 0; round < ROUNDS; round += 1) {
            await startRoundWithTuesdayOnlyInChange()
            const input = await bookingInput()
            const booking: PoolClient = await getPool().connect()
            let canceling: Promise<PromiseSettledResult<request.Response>> | null = null
            let committed = false
            try {
                await booking.query("BEGIN")
                await booking.query("SELECT pg_advisory_xact_lock_shared(hashtext('schedule_config'))")
                await booking.query(
                    `INSERT INTO Appointments (session_id, question_id, reason, name, cpf_hash, cpf_masked,
                                               by_representative, documents_sent, appointment_datetime, status)
                     VALUES ($1, $2, $3, $4, $5, $6, false, '{"group": [], "question": []}'::jsonb, $7, 'PENDING')`,
                    [input.sessionId, questionId, input.reason, input.name, input.cpfHash, input.cpfMasked, input.appointmentDatetime],
                )
                canceling = settled(deleteVersion())
                await waitForLockWaiters(1)
                await booking.query("COMMIT")
                committed = true
            } finally {
                if (!committed) {
                    await booking.query("ROLLBACK")
                }
                booking.release()
            }
            const result = await canceling

            expect(result.status === "fulfilled" && result.value.status).toBe(409)
            expect(await changesOn(changeDate)).toBe(1)
            expect(await bookedOnTuesday()).toBe(1)
        }
    })

    it("nunca deixa passar ao mesmo tempo a reserva da terça e o cancelamento da mudança que abre a terça", async () => {
        for (let round = 0; round < ROUNDS; round += 1) {
            await startRoundWithTuesdayOnlyInChange()
            const input = await bookingInput()

            const [booking, canceling] = await Promise.all([
                settled(scheduleRepository.bookAppointment(input)),
                settled(deleteVersion()),
            ])

            const booked = booking.status === "fulfilled"
            const canceled = canceling.status === "fulfilled" && canceling.value.status === 204
            expect(booked && canceled).toBe(false)
            if (!booked) {
                expect(booking.reason).toBeInstanceOf(SlotFullError)
            }
            if (!canceled) {
                expect(canceling.status === "fulfilled" && canceling.value.status).toBe(409)
            }
            expect([await bookedOnTuesday(), await changesOn(changeDate)]).toEqual([booked ? 1 : 0, canceled ? 0 : 1])
        }
    })
})
