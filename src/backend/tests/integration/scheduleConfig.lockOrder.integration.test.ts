import { randomBytes } from "node:crypto"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import getPool from "../../db/connection"
import { createAppointmentRepository } from "../../repositories/appointment.repository"
import { scheduleRepository } from "../../repositories/schedule.repository"
import { normalizeAndValidateScheduleConfig } from "../../services/scheduleRules"
import type { Permission } from "../../types/auth.types"
import { addDaysToDateString, getLocalParts, parseLocalDate } from "../../utils/date.utils"
import {
    createAppointmentScope,
    createTestAppointment,
    deleteAppointmentScope,
    OwnedAppointmentScope,
} from "./helpers/appointmentsDb"
import {
    restoreScheduleConfig,
    ScheduleConfigSnapshot,
    snapshotScheduleConfig,
    useScheduleConfig,
} from "./helpers/scheduleDb"
import { appointmentState, createTestUser, deleteTestUsers, TestUser } from "./helpers/usersDb"

const ROUNDS = 5
const MANAGE: Permission[] = ["appointments.view", "appointments.manage", "schedule.configure"]
const repository = createAppointmentRepository()

const config = normalizeAndValidateScheduleConfig({
    slotMinutes: 30,
    seatsPerSlot: 2,
    windowDays: 30,
    minNoticeDays: 1,
    waitAlertDays: 7,
    unitAddress: "Rua do Procon, 100",
    unitAddressComplement: null,
    reminderEnabled: true,
    reminderHours: 24,
    ranges: [1, 2, 3, 4, 5].map((weekday) => ({ weekday, slotIndex: 1, startTime: "08:00", endTime: "12:00" })),
    blockedDates: [],
})

function nextWednesday(): string {
    let curr = addDaysToDateString(getLocalParts(new Date()).dateStr, 2)
    while (new Date(`${curr}T12:00:00Z`).getUTCDay() !== 3) {
        curr = addDaysToDateString(curr, 1)
    }
    return curr
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

function settled<T>(promise: Promise<T>): Promise<PromiseSettledResult<T>> {
    return promise.then(
        (value): PromiseSettledResult<T> => ({ status: "fulfilled", value }),
        (reason: unknown): PromiseSettledResult<T> => ({ status: "rejected", reason }),
    )
}

describe("Ordem de travas entre salvar a grade e atribuir um agendamento (Postgres)", () => {
    const createdUserIds: (number | null)[] = []
    let savedSnapshot: ScheduleConfigSnapshot | null = null
    let scope: OwnedAppointmentScope
    let admin: TestUser

    beforeAll(async () => {
        savedSnapshot = await snapshotScheduleConfig()
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
        admin = await createTestUser({ isAdmin: true })
        createdUserIds.push(admin.createdId)
        scope = await createAppointmentScope(admin.id, "schedule_lock_order")
    })

    afterAll(async () => {
        try {
            await deleteAppointmentScope(scope)
            if (savedSnapshot) {
                await restoreScheduleConfig(savedSnapshot)
            }
            await deleteTestUsers(createdUserIds)
        } finally {
            await getPool().end()
        }
    })

    it("Ana salva a grade enquanto Bruno atribui a Ana um agendamento futuro, sem deadlock", async () => {
        const ana = await createTestUser({ name: "Ana Grade", permissions: MANAGE })
        createdUserIds.push(ana.createdId)
        const bruno = await createTestUser({ name: "Bruno Grade", permissions: MANAGE })
        createdUserIds.push(bruno.createdId)
        const id = await createTestAppointment(scope, {
            status: "PENDING",
            appointmentDatetime: parseLocalDate(nextWednesday(), "09:00"),
            cpfHash: randomBytes(32).toString("hex"),
        })

        for (let round = 0; round < ROUNDS; round += 1) {
            await getPool().query("UPDATE Appointments SET status = 'PENDING', assigned_user_id = NULL WHERE id = $1", [id])
            const blocker = await getPool().connect()
            let results: [PromiseSettledResult<unknown>, PromiseSettledResult<unknown>]
            try {
                await blocker.query("BEGIN")
                await blocker.query("SELECT id FROM Appointments WHERE id = $1 FOR UPDATE", [id])
                const saving = settled(scheduleRepository.saveConfig({ config, actorUserId: ana.id, now: new Date() }))
                await waitForLockWaiters(1)
                const assigning = settled(repository.assign(String(id), ana.id, bruno.id, new Date()))
                await waitForLockWaiters(2)
                await blocker.query("COMMIT")
                results = [await saving, await assigning]
            } finally {
                blocker.release()
            }

            for (const result of results) {
                if (result.status === "rejected") {
                    expect(result.reason).not.toMatchObject({ code: "40P01" })
                }
            }
            expect(results.map((result) => result.status)).toEqual(["fulfilled", "fulfilled"])
            expect(await appointmentState(id)).toEqual({ status: "CONFIRMED", assignedUserId: ana.id })
        }
    })
})
