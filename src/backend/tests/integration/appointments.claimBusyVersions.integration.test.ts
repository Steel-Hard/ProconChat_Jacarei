import { randomBytes } from "node:crypto"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import getPool from "../../db/connection"
import { createAppointmentRepository } from "../../repositories/appointment.repository"
import type { AppointmentStatus } from "../../types/appointment.types"
import type { Permission } from "../../types/auth.types"
import { parseLocalDate } from "../../utils/date.utils"
import {
    createAppointmentScope,
    createTestAppointment,
    deleteAppointmentScope,
    OwnedAppointmentScope,
} from "./helpers/appointmentsDb"
import {
    insertScheduleChange,
    restoreScheduleConfig,
    ScheduleConfigSnapshot,
    snapshotScheduleConfig,
    useScheduleConfig,
} from "./helpers/scheduleDb"
import { appointmentState, createTestUser, deleteTestUsers, TestUser } from "./helpers/usersDb"

const NOW = new Date("2031-01-10T12:00:00.000Z")
const CHANGE_DATE = "2031-08-04"
const BEFORE_CHANGE = "2031-08-01"
const MANAGE: Permission[] = ["appointments.view", "appointments.manage"]
const repository = createAppointmentRepository()

const sixtyMinuteChange = {
    slotMinutes: 60,
    seatsPerSlot: 5,
    windowDays: 30,
    minNoticeDays: 0,
    waitAlertDays: 7,
    unitAddress: "Rua Teste, 1",
    unitAddressComplement: null,
    reminderEnabled: false,
    reminderHours: 24,
    ranges: [],
    blockedDates: [],
}

describe("Checagem de responsável ocupado usa a duração da versão do dia com Postgres", () => {
    const createdUserIds: (number | null)[] = []
    let admin: TestUser
    let scope: OwnedAppointmentScope
    let scheduleSnapshot: ScheduleConfigSnapshot

    async function user(input: Parameters<typeof createTestUser>[0]): Promise<TestUser> {
        const created = await createTestUser(input)
        createdUserIds.push(created.createdId)
        return created
    }

    async function appointment(status: AppointmentStatus, at: Date, owner: TestUser | null = null): Promise<number> {
        return createTestAppointment(scope, {
            status,
            assignedUserId: owner?.id ?? null,
            appointmentDatetime: at,
            cpfHash: randomBytes(32).toString("hex"),
        })
    }

    beforeAll(async () => {
        admin = await user({ isAdmin: true })
        scope = await createAppointmentScope(admin.id, "claim_busy_versions")
        scheduleSnapshot = await snapshotScheduleConfig()
        await useScheduleConfig({
            settings: {
                slot_minutes: 30,
                seats_per_slot: 5,
                window_days: 30,
                min_notice_days: 0,
                wait_alert_days: 7,
                unit_address: "Rua Teste, 1",
                unit_address_complement: null,
                reminder_enabled: false,
                reminder_hours: 24,
            },
            ranges: [],
        })
        await insertScheduleChange(CHANGE_DATE, sixtyMinuteChange, admin.id)
    })

    afterAll(async () => {
        await restoreScheduleConfig(scheduleSnapshot)
        await deleteAppointmentScope(scope)
        await deleteTestUsers(createdUserIds)
        await getPool().end()
    })

    it("recusa assumir e atribuir o horário das 09:30 a quem tem as 09:00 confirmadas no dia da mudança de 60 minutos", async () => {
        const claimer = await user({ permissions: MANAGE })
        const assignee = await user({ permissions: MANAGE })
        const manager = await user({ permissions: MANAGE })
        await appointment("CONFIRMED", parseLocalDate(CHANGE_DATE, "09:00"), claimer)
        await appointment("CONFIRMED", parseLocalDate(CHANGE_DATE, "09:00"), assignee)
        const claimed = await appointment("PENDING", parseLocalDate(CHANGE_DATE, "09:30"))
        const assigned = await appointment("PENDING", parseLocalDate(CHANGE_DATE, "09:30"))

        const results = await Promise.allSettled([
            repository.claim(String(claimed), claimer.id, NOW),
            repository.assign(String(assigned), assignee.id, manager.id, NOW),
        ])

        expect(results.map((result) => result.status === "rejected" && result.reason)).toEqual([
            expect.objectContaining({ statusCode: 409, code: "ASSIGNEE_BUSY" }),
            expect.objectContaining({ statusCode: 409, code: "ASSIGNEE_BUSY" }),
        ])
        expect(await appointmentState(claimed)).toEqual({ status: "PENDING", assignedUserId: null })
        expect(await appointmentState(assigned)).toEqual({ status: "PENDING", assignedUserId: null })
    })

    it("aceita o mesmo par antes da mudança, com a duração de 30 minutos da configuração-base", async () => {
        const actor = await user({ permissions: MANAGE })
        await appointment("CONFIRMED", parseLocalDate(BEFORE_CHANGE, "09:00"), actor)
        const id = await appointment("PENDING", parseLocalDate(BEFORE_CHANGE, "09:30"))

        await repository.claim(String(id), actor.id, NOW)

        expect(await appointmentState(id)).toEqual({ status: "CONFIRMED", assignedUserId: actor.id })
    })
})
