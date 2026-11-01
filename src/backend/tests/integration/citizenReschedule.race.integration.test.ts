import { afterAll, beforeAll, describe, expect, it } from "vitest"
import getPool from "../../db/connection"
import AppointmentNotChangeableError from "../../errors/AppointmentNotChangeableError"
import SlotFullError from "../../errors/SlotFullError"
import { appointmentRepository } from "../../repositories/appointment.repository"
import { scheduleRepository } from "../../repositories/schedule.repository"
import { sessionRepository } from "../../repositories/session.repository"
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

const ROUNDS = 5
const HOUR = 60 * 60 * 1000
const SLOT_TIMES = ["08:00", "08:30", "09:00", "09:30", "10:00"]

const phones = {
    booker: (round: number) => `551299999062${round}`,
    rescheduler: (round: number) => `551299999063${round}`,
    otherRescheduler: (round: number) => `551299999064${round}`,
    staffCanceled: (round: number) => `551299999065${round}`,
}

const allPhones = Array.from({ length: ROUNDS }, (_, round) => [
    phones.booker(round),
    phones.rescheduler(round),
    phones.otherRescheduler(round),
    phones.staffCanceled(round),
]).flat()

function nextTuesday(): string {
    let curr = addDaysToDateString(getLocalParts(new Date()).dateStr, 2)
    while (new Date(`${curr}T12:00:00Z`).getUTCDay() !== 2) {
        curr = addDaysToDateString(curr, 1)
    }
    return curr
}

async function advisoryWaiters(): Promise<number> {
    const result = await getPool().query<{ waiting: number }>(
        "SELECT COUNT(*)::int AS waiting FROM pg_locks WHERE locktype = 'advisory' AND NOT granted",
    )
    return result.rows[0]?.waiting ?? 0
}

async function waitForAdvisoryWaiters(count: number): Promise<void> {
    const deadline = Date.now() + 5_000
    while ((await advisoryWaiters()) < count) {
        if (Date.now() > deadline) {
            throw new Error(`Esperava ${count} transações aguardando a trava do horário`)
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

async function raceOnHeldSlot<A, B>(
    slot: Date,
    first: () => Promise<A>,
    second: () => Promise<B>,
): Promise<[PromiseSettledResult<A>, PromiseSettledResult<B>]> {
    const blocker = await getPool().connect()
    try {
        await blocker.query("BEGIN")
        await blocker.query("SELECT pg_advisory_xact_lock(hashtext('slot:' || $1::text))", [slot.toISOString()])
        const firstResult = settle(first())
        await waitForAdvisoryWaiters(1)
        const secondResult = settle(second())
        await waitForAdvisoryWaiters(2)
        await blocker.query("COMMIT")
        return [await firstResult, await secondResult]
    } finally {
        blocker.release()
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

async function raceOnHeldAppointment<A, B>(
    appointmentId: string,
    first: () => Promise<A>,
    second: () => Promise<B>,
): Promise<[PromiseSettledResult<A>, PromiseSettledResult<B>]> {
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

async function activeInSlot(slot: Date): Promise<number> {
    const result = await getPool().query<{ count: number }>(
        "SELECT COUNT(*)::int AS count FROM Appointments WHERE appointment_datetime = $1 AND status IN ('PENDING', 'CONFIRMED')",
        [slot],
    )
    return result.rows[0]?.count ?? 0
}

describe("corridas da remarcação pelo cidadão (Postgres)", () => {
    const createdAppointmentIds: string[] = []
    const tuesday = nextTuesday()
    const now = new Date(Math.floor(Date.now() / 1000) * 1000)
    let savedSnapshot: ScheduleConfigSnapshot | null = null
    let questionId: number
    let cpfCount = 0
    let adminUserId: number
    let createdAdminId: number | null = null

    async function useLastSeatSchedule(): Promise<void> {
        await useScheduleConfig({
            settings: {
                slot_minutes: 30,
                seats_per_slot: 1,
                window_days: 30,
                min_notice_days: 1,
                wait_alert_days: 7,
                unit_address: "Rua do Procon, 100",
                unit_address_complement: null,
                reminder_enabled: true,
                reminder_hours: 24,
            },
            ranges: [{ weekday: 2, slot_index: 1, start_time: "08:00", end_time: "12:00" }],
        })
    }

    function nextCpfHash(): string {
        cpfCount += 1
        return String(9000 + cpfCount).padStart(64, "0")
    }

    async function returningCitizen(phone: string, hoursAhead: number) {
        const appointmentId = await insertCitizenAppointment({
            phone,
            questionId,
            cpfHash: nextCpfHash(),
            appointmentDatetime: new Date(now.getTime() + hoursAhead * HOUR),
        })
        createdAppointmentIds.push(appointmentId)
        const session = await sessionRepository.findOrCreateActive(hashPhone(phone))
        return { appointmentId, sessionId: session.id, phoneHash: hashPhone(phone) }
    }

    async function bookingFor(phone: string, slot: Date) {
        const session = await sessionRepository.findOrCreateActive(hashPhone(phone))
        return {
            sessionId: session.id,
            questionId,
            reason: "REQUIRES_IN_PERSON" as const,
            name: "Cidadão Corrida",
            cpfHash: nextCpfHash(),
            cpfMasked: "***.123.123-**",
            phone,
            byRepresentative: false,
            appointmentDatetime: slot,
        }
    }

    beforeAll(async () => {
        await cleanupScheduleTestData({ phoneHashes: allPhones.map(hashPhone), appointmentIds: [] })
        savedSnapshot = await snapshotScheduleConfig()
        questionId = (await createTestQuestion()).questionId
        await useLastSeatSchedule()
        const admin = await loginAdmin()
        adminUserId = admin.adminUserId
        createdAdminId = admin.createdAdminId
    })

    afterAll(async () => {
        try {
            await cleanupScheduleTestData({ phoneHashes: allPhones.map(hashPhone), appointmentIds: createdAppointmentIds })
            await deleteTestUsers([createdAdminId])
        } finally {
            try {
                if (savedSnapshot) {
                    await restoreScheduleConfig(savedSnapshot)
                }
            } finally {
                await getPool().end()
            }
        }
    })

    it("deixa só um entre a reserva e a remarcação ficar com a última vaga, e o outro recebe SlotFullError", async () => {
        for (let round = 0; round < ROUNDS; round += 1) {
            const slot = parseLocalDate(tuesday, SLOT_TIMES[round]!)
            const booking = await bookingFor(phones.booker(round), slot)
            const citizen = await returningCitizen(phones.rescheduler(round), 30 + round)

            const results = await raceOnHeldSlot(
                slot,
                () => scheduleRepository.bookAppointment(booking),
                () => scheduleRepository.rescheduleByCitizen({ ...citizen, appointmentDatetime: slot, now }),
            )

            expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1)
            const rejected = results.find((result) => result.status === "rejected")
            expect(rejected?.status === "rejected" ? rejected.reason : null).toBeInstanceOf(SlotFullError)
            expect(await activeInSlot(slot)).toBe(1)
        }
    })

    it("deixa só uma de duas remarcações de cidadãos diferentes ficar com a última vaga", async () => {
        for (let round = 0; round < ROUNDS; round += 1) {
            const slot = parseLocalDate(addDaysToDateString(tuesday, 7), SLOT_TIMES[round]!)
            const first = await returningCitizen(phones.rescheduler(round), 40 + round)
            const second = await returningCitizen(phones.otherRescheduler(round), 50 + round)

            const results = await raceOnHeldSlot(
                slot,
                () => scheduleRepository.rescheduleByCitizen({ ...first, appointmentDatetime: slot, now }),
                () => scheduleRepository.rescheduleByCitizen({ ...second, appointmentDatetime: slot, now }),
            )

            expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1)
            const rejected = results.find((result) => result.status === "rejected")
            expect(rejected?.status === "rejected" ? rejected.reason : null).toBeInstanceOf(SlotFullError)
            expect(await activeInSlot(slot)).toBe(1)
        }
    })

    it("faz a remarcação falhar com AppointmentNotChangeableError quando o cancelamento da equipe pega a trava da linha primeiro", async () => {
        const slot = parseLocalDate(addDaysToDateString(tuesday, 14), "08:00")
        const citizen = await returningCitizen(phones.staffCanceled(0), 60)
        const before = await storedCitizenAppointment(citizen.appointmentId)

        const [cancel, reschedule] = await raceOnHeldAppointment(
            citizen.appointmentId,
            () => appointmentRepository.cancel(citizen.appointmentId, adminUserId, "OTHER", undefined),
            () => scheduleRepository.rescheduleByCitizen({ ...citizen, appointmentDatetime: slot, now }),
        )

        expect(cancel.status).toBe("fulfilled")
        expect(reschedule.status === "rejected" ? reschedule.reason : null).toBeInstanceOf(AppointmentNotChangeableError)
        expect(await storedCitizenAppointment(citizen.appointmentId)).toEqual({ ...before, status: "CANCELED" })
        expect((await eventsOf([Number(citizen.appointmentId)])).map((event) => event.type)).toEqual(["CANCELED_BY_STAFF"])
    })
})
