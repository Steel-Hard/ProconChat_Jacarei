import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import app from "../../app"
import getPool from "../../db/connection"
import { addDaysToDateString, getLocalParts, parseLocalDate } from "../../utils/date.utils"
import {
    createAppointmentScope,
    createTestAppointment,
    deleteAppointmentScope,
    loginAdmin,
    OwnedAppointmentScope,
} from "./helpers/appointmentsDb"
import {
    restoreScheduleConfig,
    ScheduleConfigSnapshot,
    snapshotScheduleConfig,
    useScheduleConfig,
} from "./helpers/scheduleDb"
import { createTestUser, deleteTestUsers, TestUser } from "./helpers/usersDb"

const ORIGIN = process.env.FRONTEND_ORIGIN as string

function nextWednesday(fromDateStr: string): string {
    let curr = addDaysToDateString(fromDateStr, 2)
    while (new Date(`${curr}T12:00:00Z`).getUTCDay() !== 3) {
        curr = addDaysToDateString(curr, 1)
    }
    return curr
}

describe("PUT /api/v1/schedule com agendamentos do mesmo responsável (Postgres)", () => {
    const createdUserIds: (number | null)[] = []
    let savedSnapshot: ScheduleConfigSnapshot | null = null
    let scope: OwnedAppointmentScope | null = null
    let configurer: TestUser
    let staff: TestUser

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

        configurer = await createTestUser({ permissions: ["schedule.configure"] })
        createdUserIds.push(configurer.createdId)
        staff = await createTestUser({ permissions: ["appointments.manage"] })
        createdUserIds.push(staff.createdId)
        const admin = await loginAdmin()
        createdUserIds.push(admin.createdAdminId)
        scope = await createAppointmentScope(admin.adminUserId, "responsible_overlap")
    })

    afterAll(async () => {
        try {
            if (scope) {
                await deleteAppointmentScope(scope)
            }
            if (savedSnapshot) {
                await restoreScheduleConfig(savedSnapshot)
            }
            await deleteTestUsers(createdUserIds)
        } finally {
            await getPool().end()
        }
    })

    it("responde 409 com RESPONSIBLE_OVERLAP para o agendamento da grade e não grava a nova duração", async () => {
        const wednesday = nextWednesday(getLocalParts(new Date()).dateStr)
        const onGridId = await createTestAppointment(scope!, {
            status: "CONFIRMED",
            assignedUserId: staff.id,
            appointmentDatetime: parseLocalDate(wednesday, "09:00"),
        })
        const offGridId = await createTestAppointment(scope!, {
            status: "CONFIRMED",
            assignedUserId: staff.id,
            appointmentDatetime: parseLocalDate(wednesday, "09:30"),
        })
        await getPool().query("UPDATE Appointments SET off_grid = TRUE WHERE id = $1", [offGridId])
        const offGridProtocol = (
            await getPool().query<{ protocol: string }>(
                "SELECT UPPER(SUBSTRING(appointment_code::text, 1, 8)) AS protocol FROM Appointments WHERE id = $1",
                [offGridId],
            )
        ).rows[0]!.protocol
        const current = (await request(app).get("/api/v1/schedule").set("Cookie", configurer.cookie)).body.data

        const response = await request(app)
            .put("/api/v1/schedule")
            .set("Cookie", configurer.cookie)
            .set("Origin", ORIGIN)
            .send({ ...current, slotMinutes: 60 })

        expect(response.status).toBe(409)
        expect(response.body.error.code).toBe("SCHEDULE_CONFLICTS")
        const ownIds = new Set([String(onGridId), String(offGridId)])
        const own = response.body.error.details.conflicts.filter((c: { id: string }) => ownIds.has(c.id))
        expect(own).toEqual([
            expect.objectContaining({
                id: String(onGridId),
                date: wednesday,
                time: "09:00",
                code: "RESPONSIBLE_OVERLAP",
                reason: `Responsável com outro agendamento sobreposto com atendimentos de 60 minutos (protocolo ${offGridProtocol})`,
                conflictingAppointmentId: String(offGridId),
                conflictingProtocol: offGridProtocol,
            }),
        ])
        const after = await request(app).get("/api/v1/schedule").set("Cookie", configurer.cookie)
        expect(after.body.data.slotMinutes).toBe(30)
    })
})
