import type { PoolClient } from "pg"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import getPool from "../../db/connection"
import SlotFullError from "../../errors/SlotFullError"
import { scheduleRepository } from "../../repositories/schedule.repository"
import { sessionRepository } from "../../repositories/session.repository"
import { BookAppointmentResult } from "../../types/schedule.types"
import { addDaysToDateString, getLocalParts, parseLocalDate } from "../../utils/date.utils"
import { hashPhone as phoneHash } from "./helpers/phone"
import {
    cleanupScheduleTestData,
    createTestQuestion,
    restoreScheduleConfig,
    ScheduleConfigSnapshot,
    snapshotScheduleConfig,
    useScheduleConfig,
} from "./helpers/scheduleDb"

const phones = {
    removed: "5512999991001",
    kept: "5512999991002",
    outside: "5512999991003",
    shared: "5512999991004",
    fullDayBlocked: "5512999991005",
    periodBlocked: "5512999991006",
}

function nextTuesday(): string {
    let curr = addDaysToDateString(getLocalParts(new Date()).dateStr, 2)
    while (new Date(`${curr}T12:00:00Z`).getUTCDay() !== 2) {
        curr = addDaysToDateString(curr, 1)
    }
    return curr
}

async function waitForAdvisoryWaiter(timeoutMs = 5000): Promise<void> {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
        const result = await getPool().query<{ waiting: string }>(
            "SELECT COUNT(*)::text AS waiting FROM pg_locks WHERE locktype = 'advisory' AND NOT granted",
        )
        if (Number(result.rows[0]?.waiting ?? 0) > 0) {
            return
        }
        await new Promise((resolve) => setTimeout(resolve, 20))
    }
    throw new Error("Nenhuma transação esperou pela trava da agenda")
}

function settle<T>(promise: Promise<T>): Promise<{ value?: T; error?: unknown }> {
    return promise.then(
        (value) => ({ value }),
        (error: unknown) => ({ error }),
    )
}

describe("corrida entre salvar a grade e agendar pelo bot (Postgres)", () => {
    const createdAppointmentIds: string[] = []
    const tuesday = nextTuesday()
    let savedSnapshot: ScheduleConfigSnapshot | null = null
    let questionId: number

    async function bookingInput(phone: string, cpfSuffix: string, time: string) {
        const session = await sessionRepository.findOrCreateActive(phoneHash(phone))
        return {
            sessionId: session.id,
            questionId,
            reason: "REQUIRES_IN_PERSON" as const,
            name: "Cidadão Corrida",
            cpfHash: cpfSuffix.padStart(64, "0"),
            cpfMasked: "***.123.123-**",
            phone,
            byRepresentative: false,
            appointmentDatetime: parseLocalDate(tuesday, time),
        }
    }

    async function withManualTransaction(
        lockSql: string,
        changes: (client: PoolClient) => Promise<void>,
        whileHeld: () => Promise<void>,
    ): Promise<void> {
        const client = await getPool().connect()
        let finished = false
        try {
            await client.query("BEGIN")
            await client.query(lockSql)
            await changes(client)
            await whileHeld()
            await client.query("COMMIT")
            finished = true
        } finally {
            if (!finished) {
                await client.query("ROLLBACK")
            }
            client.release()
        }
    }

    async function appointmentsOfSession(sessionId: string): Promise<number> {
        const result = await getPool().query("SELECT id FROM Appointments WHERE session_id = $1", [sessionId])
        return result.rowCount ?? 0
    }

    async function conversationEventTypes(sessionId: string): Promise<string[]> {
        const result = await getPool().query<{ type: string }>(
            "SELECT type FROM ConversationEvents WHERE session_id = $1 ORDER BY id",
            [sessionId],
        )
        return result.rows.map((row) => row.type)
    }

    async function sessionStatus(sessionId: string): Promise<string | undefined> {
        const result = await getPool().query<{ status: string }>("SELECT status FROM Sessions WHERE id = $1", [
            sessionId,
        ])
        return result.rows[0]?.status
    }

    beforeAll(async () => {
        await cleanupScheduleTestData({ phoneHashes: Object.values(phones).map(phoneHash), appointmentIds: [] })
        savedSnapshot = await snapshotScheduleConfig()
        questionId = (await createTestQuestion()).questionId
    })

    beforeEach(async () => {
        await useScheduleConfig({
            settings: {
                slot_minutes: 30,
                seats_per_slot: 2,
                window_days: 30,
                min_notice_days: 1,
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
    })

    afterAll(async () => {
        try {
            await cleanupScheduleTestData({
                phoneHashes: Object.values(phones).map(phoneHash),
                appointmentIds: createdAppointmentIds,
            })
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

    it("espera o salvamento terminar e recusa o horário que o salvamento removeu, sem gravar nada", async () => {
        const input = await bookingInput(phones.removed, "301", "09:00")
        let outcome: Promise<{ value?: BookAppointmentResult; error?: unknown }> | null = null

        await withManualTransaction(
            "SELECT pg_advisory_xact_lock(hashtext('schedule_config'))",
            async (client) => {
                await client.query("DELETE FROM ScheduleRanges WHERE weekday = 2")
            },
            async () => {
                outcome = settle(scheduleRepository.bookAppointment(input))
                await waitForAdvisoryWaiter()
            },
        )
        const result = await outcome!

        expect(result.error).toBeInstanceOf(SlotFullError)
        expect(await appointmentsOfSession(input.sessionId)).toBe(0)
        expect(await sessionStatus(input.sessionId)).toBe("IN_PROGRESS")
        const eventTypes = await conversationEventTypes(input.sessionId)
        expect(eventTypes).not.toContain("PHONE_NOTICE_SHOWN")
        expect(eventTypes).not.toContain("APPOINTMENT_CREATED")
    })

    it.each([
        {
            label: "de dia inteiro",
            phone: phones.fullDayBlocked,
            cpfSuffix: "305",
            time: "10:30",
            startTime: null,
            endTime: null,
        },
        {
            label: "de período",
            phone: phones.periodBlocked,
            cpfSuffix: "306",
            time: "11:00",
            startTime: "10:45",
            endTime: "11:15",
        },
    ])(
        "espera o salvamento terminar e recusa o horário que o salvamento bloqueou $label, sem gravar nada",
        async ({ phone, cpfSuffix, time, startTime, endTime }) => {
            const input = await bookingInput(phone, cpfSuffix, time)
            let outcome: Promise<{ value?: BookAppointmentResult; error?: unknown }> | null = null

            await withManualTransaction(
                "SELECT pg_advisory_xact_lock(hashtext('schedule_config'))",
                async (client) => {
                    await client.query(
                        "INSERT INTO BlockedDates (date, start_time, end_time, description) VALUES ($1, $2, $3, 'Bloqueio da corrida')",
                        [tuesday, startTime, endTime],
                    )
                },
                async () => {
                    outcome = settle(scheduleRepository.bookAppointment(input))
                    await waitForAdvisoryWaiter()
                },
            )
            const result = await outcome!

            expect(result.error).toBeInstanceOf(SlotFullError)
            expect(await appointmentsOfSession(input.sessionId)).toBe(0)
            expect(await sessionStatus(input.sessionId)).toBe("IN_PROGRESS")
            const eventTypes = await conversationEventTypes(input.sessionId)
            expect(eventTypes).not.toContain("PHONE_NOTICE_SHOWN")
            expect(eventTypes).not.toContain("APPOINTMENT_CREATED")
        },
    )

    it("espera o salvamento terminar e grava normalmente quando o horário continua na grade", async () => {
        const input = await bookingInput(phones.kept, "302", "09:00")
        let outcome: Promise<{ value?: BookAppointmentResult; error?: unknown }> | null = null

        await withManualTransaction(
            "SELECT pg_advisory_xact_lock(hashtext('schedule_config'))",
            async (client) => {
                await client.query("DELETE FROM ScheduleRanges WHERE weekday = 2")
                await client.query(
                    "INSERT INTO ScheduleRanges (weekday, slot_index, start_time, end_time) VALUES (2, 1, '08:00', '10:00')",
                )
            },
            async () => {
                outcome = settle(scheduleRepository.bookAppointment(input))
                await waitForAdvisoryWaiter()
            },
        )
        const result = await outcome!
        if (result.value) {
            createdAppointmentIds.push(result.value.id)
        }

        expect(result.error).toBeUndefined()
        expect(result.value?.appointmentDatetime.toISOString()).toBe(input.appointmentDatetime.toISOString())
        expect(await appointmentsOfSession(input.sessionId)).toBe(1)
        const eventTypes = await conversationEventTypes(input.sessionId)
        expect(eventTypes).toContain("PHONE_NOTICE_SHOWN")
        expect(eventTypes).toContain("APPOINTMENT_CREATED")
        expect(await sessionStatus(input.sessionId)).toBe("FINISHED")
    })

    it("recusa com SlotFullError o horário que não está na grade atual, sem gravar nada", async () => {
        const input = await bookingInput(phones.outside, "303", "07:00")

        await expect(scheduleRepository.bookAppointment(input)).rejects.toBeInstanceOf(SlotFullError)

        expect(await appointmentsOfSession(input.sessionId)).toBe(0)
        expect(await sessionStatus(input.sessionId)).toBe("IN_PROGRESS")
        const eventTypes = await conversationEventTypes(input.sessionId)
        expect(eventTypes).not.toContain("PHONE_NOTICE_SHOWN")
        expect(eventTypes).not.toContain("APPOINTMENT_CREATED")
    })

    it("não espera outra transação que segura só a trava compartilhada da agenda", async () => {
        const input = await bookingInput(phones.shared, "304", "09:30")
        let booking: Promise<{ value?: BookAppointmentResult; error?: unknown }> | null = null
        let finishedBeforeCommit = false

        await withManualTransaction(
            "SELECT pg_advisory_xact_lock_shared(hashtext('schedule_config'))",
            async () => {},
            async () => {
                booking = settle(scheduleRepository.bookAppointment(input))
                const timeout = new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 5000))
                finishedBeforeCommit = (await Promise.race([booking, timeout])) !== "timeout"
            },
        )
        const result = await booking!
        if (result.value) {
            createdAppointmentIds.push(result.value.id)
        }

        expect(finishedBeforeCommit).toBe(true)
        expect(result.error).toBeUndefined()
        expect(await appointmentsOfSession(input.sessionId)).toBe(1)
    })
})
