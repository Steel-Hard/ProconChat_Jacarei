import { randomBytes } from "node:crypto"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import getPool from "../../db/connection"
import { createUserAccountRepository } from "../../repositories/userAccount.repository"
import { decideAccountBatch } from "../../services/userAccountRules"
import type { AppointmentStatus } from "../../types/appointment.types"
import type { Permission } from "../../types/auth.types"
import type { AccountChange, AccountRequester } from "../../types/userAccount.types"
import {
    createAppointmentScope,
    createTestAppointment,
    deleteAppointmentScope,
    OwnedAppointmentScope,
} from "./helpers/appointmentsDb"
import { restoreScheduleConfig, ScheduleConfigSnapshot, snapshotScheduleConfig, useScheduleConfig } from "./helpers/scheduleDb"
import { appointmentState, createTestUser, deleteTestUsers, TestUser } from "./helpers/usersDb"

const NOW = new Date("2031-01-10T12:00:00.000Z")
const MANAGE: Permission[] = ["appointments.view", "appointments.manage"]
const repository = createUserAccountRepository()

describe("Redistribuição em lote do repositório com Postgres", () => {
    const createdUserIds: (number | null)[] = []
    let manager: TestUser
    let requester: AccountRequester
    let scope: OwnedAppointmentScope
    let scheduleSnapshot: ScheduleConfigSnapshot
    let day = 0

    async function user(input: Parameters<typeof createTestUser>[0]): Promise<TestUser> {
        const created = await createTestUser(input)
        createdUserIds.push(created.createdId)
        return created
    }

    function nextDayAt(hour: number, minute = 0): Date {
        day += 1
        return new Date(Date.UTC(2032, 5, day, hour, minute))
    }

    async function appointmentOf(owner: TestUser, at: Date, status: AppointmentStatus = "CONFIRMED"): Promise<number> {
        return createTestAppointment(scope, {
            status,
            assignedUserId: owner.id,
            appointmentDatetime: at,
            cpfHash: randomBytes(32).toString("hex"),
        })
    }

    function batch(changes: AccountChange[]) {
        return repository.applyAccountBatch({ requester, changes, now: NOW }, decideAccountBatch)
    }

    beforeAll(async () => {
        const admin = await user({ isAdmin: true })
        manager = await user({ permissions: [...MANAGE, "users.manage"] })
        requester = { id: manager.id, isAdmin: false, permissions: [...MANAGE, "users.manage"] }
        scope = await createAppointmentScope(admin.id, "accounts_redistribution")
        scheduleSnapshot = await snapshotScheduleConfig()
        await useScheduleConfig({
            settings: {
                slot_minutes: 30,
                seats_per_slot: 2,
                window_days: 30,
                min_notice_days: 1,
                wait_alert_days: 7,
                unit_address: "Rua Teste, 1",
                unit_address_complement: null,
                reminder_enabled: false,
                reminder_hours: 24,
            },
            ranges: [],
        })
    })

    afterAll(async () => {
        await restoreScheduleConfig(scheduleSnapshot)
        await deleteAppointmentScope(scope)
        await deleteTestUsers(createdUserIds)
        await getPool().end()
    })

    it("soma em redistributed os agendamentos de todas as contas do lote", async () => {
        const first = await user({ permissions: MANAGE })
        const second = await user({ permissions: MANAGE })
        const destination = await user({ permissions: MANAGE })
        await appointmentOf(first, nextDayAt(9))
        await appointmentOf(first, nextDayAt(9))
        await appointmentOf(second, nextDayAt(9))

        const result = await batch([
            { userId: first.id, active: false, reassignment: { mode: "assign", toUserId: destination.id } },
            { userId: second.id, permissions: ["appointments.view"], reassignment: { mode: "pending" } },
        ])

        expect(result.redistributed).toBe(3)
    })

    it.each<AppointmentStatus>(["CANCELED", "ATTENDED", "NO_SHOW"])(
        "aceita o destino com um %s no mesmo horario",
        async (status) => {
            const staff = await user({ permissions: MANAGE })
            const destination = await user({ permissions: MANAGE })
            const at = nextDayAt(10)
            const moving = await appointmentOf(staff, at)
            await appointmentOf(destination, at, status)

            await batch([{ userId: staff.id, active: false, reassignment: { mode: "assign", toUserId: destination.id } }])

            expect(await appointmentState(moving)).toEqual({ status: "CONFIRMED", assignedUserId: destination.id })
        },
    )
})
