import { randomBytes } from "node:crypto"
import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import app from "../../app"
import getPool from "../../db/connection"
import { NormalizedScheduleConfig } from "../../types/schedule.types"
import { addDaysToDateString, getLocalParts, parseLocalDate } from "../../utils/date.utils"
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
import { createTestUser, deleteTestUsers, TestUser } from "./helpers/usersDb"

const ORIGIN = process.env.FRONTEND_ORIGIN as string
const TUESDAY = 2
const WITHOUT_TUESDAY = [1, 3, 4, 5]
const UNKNOWN_APPOINTMENT_ID = "999999999"

function dayOfWeek(dateStr: string): number {
    return new Date(`${dateStr}T12:00:00Z`).getUTCDay()
}

function nextWeekdayFrom(dateStr: string, weekday: number): string {
    let current = dateStr
    while (dayOfWeek(current) !== weekday) {
        current = addDaysToDateString(current, 1)
    }
    return current
}

function rangesOn(weekdays: number[]) {
    return weekdays.map((weekday) => ({ weekday, startTime: "08:00", endTime: "12:00" }))
}

function weekdayConfig(weekdays: number[]): NormalizedScheduleConfig {
    return {
        slotMinutes: 30,
        seatsPerSlot: 2,
        windowDays: 30,
        minNoticeDays: 0,
        waitAlertDays: 7,
        unitAddress: "Rua do Procon, 100",
        unitAddressComplement: "Sala 1",
        reminderEnabled: true,
        reminderHours: 24,
        ranges: weekdays.map((weekday) => ({ weekday, slotIndex: 1, startTime: "08:00", endTime: "12:00" })),
        blockedDates: [],
    }
}

function bodyOf(weekdays: number[], extra: Record<string, unknown> = {}) {
    return { ...weekdayConfig(weekdays), ranges: rangesOn(weekdays), ...extra }
}

describe("conferência do que a equipe viu ao resolver conflitos, com Postgres", () => {
    const createdUserIds: (number | null)[] = []
    let savedSnapshot: ScheduleConfigSnapshot | null = null
    let originalWhatsAppSettings: Record<string, unknown> | undefined
    let manager: TestUser
    let admin: TestUser
    let scope: OwnedAppointmentScope
    let today: string
    let changeDate: string
    let tuesdayInChange: string
    let tuesdayToday: string

    async function user(input: Parameters<typeof createTestUser>[0]): Promise<TestUser> {
        const created = await createTestUser(input)
        createdUserIds.push(created.createdId)
        return created
    }

    async function appointmentAt(dateStr: string, time = "09:00"): Promise<string> {
        const id = await createTestAppointment(scope, {
            status: "CONFIRMED",
            appointmentDatetime: parseLocalDate(dateStr, time),
            cpfHash: randomBytes(32).toString("hex"),
        })
        return String(id)
    }

    async function clearScopeAppointments(): Promise<void> {
        if (scope.createdAppointmentIds.length > 0) {
            await getPool().query("DELETE FROM AppointmentEvents WHERE appointment_id = ANY($1::bigint[])", [
                scope.createdAppointmentIds,
            ])
            await getPool().query("DELETE FROM Appointments WHERE id = ANY($1::bigint[])", [scope.createdAppointmentIds])
            scope.createdAppointmentIds.splice(0)
        }
    }

    async function setNoticeEnabled(enabled: boolean): Promise<void> {
        await getPool().query("DELETE FROM WhatsAppSettings")
        await getPool().query(
            `INSERT INTO WhatsAppSettings (id, verify_token, updated_by, updated_at, cancellation_notice_enabled)
             VALUES (1, $1, $2, NOW(), $3)`,
            ["c".repeat(64), manager.id, enabled],
        )
    }

    async function restoreWhatsAppSettings(): Promise<void> {
        await getPool().query("DELETE FROM WhatsAppSettings")
        if (!originalWhatsAppSettings) {
            return
        }
        const columns = Object.keys(originalWhatsAppSettings)
        await getPool().query(
            `INSERT INTO WhatsAppSettings (${columns.join(", ")}) VALUES (${columns.map((_column, index) => `$${index + 1}`).join(", ")})`,
            columns.map((column) => originalWhatsAppSettings?.[column]),
        )
    }

    async function appointmentState(id: string): Promise<{ status: string; offGrid: boolean }> {
        const result = await getPool().query<{ status: string; off_grid: boolean }>(
            "SELECT status, off_grid FROM Appointments WHERE id = $1",
            [id],
        )
        return { status: result.rows[0]!.status, offGrid: result.rows[0]!.off_grid }
    }

    async function appointmentEventTypes(id: string): Promise<string[]> {
        const result = await getPool().query<{ type: string }>(
            "SELECT type FROM AppointmentEvents WHERE appointment_id = $1 ORDER BY id",
            [id],
        )
        return result.rows.map((row) => row.type)
    }

    async function rangeWeekdays(): Promise<number[]> {
        const result = await getPool().query<{ weekday: number }>("SELECT weekday FROM ScheduleRanges ORDER BY weekday")
        return result.rows.map((row) => row.weekday)
    }

    async function changeDates(): Promise<string[]> {
        const result = await getPool().query<{ effective_from: string }>(
            "SELECT to_char(effective_from, 'YYYY-MM-DD') AS effective_from FROM ScheduleChanges ORDER BY effective_from",
        )
        return result.rows.map((row) => row.effective_from)
    }

    function putToday(body: object): request.Test {
        return request(app).put("/api/v1/schedule").set("Cookie", manager.cookie).set("Origin", ORIGIN).send(body)
    }

    function putVersion(date: string, body: object): request.Test {
        return request(app)
            .put(`/api/v1/schedule/versions/${date}`)
            .set("Cookie", manager.cookie)
            .set("Origin", ORIGIN)
            .send(body)
    }

    function deleteVersion(date: string, body: object): request.Test {
        return request(app)
            .delete(`/api/v1/schedule/versions/${date}`)
            .set("Cookie", manager.cookie)
            .set("Origin", ORIGIN)
            .send(body)
    }

    beforeAll(async () => {
        savedSnapshot = await snapshotScheduleConfig()
        originalWhatsAppSettings = (
            await getPool().query<Record<string, unknown>>("SELECT * FROM WhatsAppSettings WHERE id = 1")
        ).rows[0]
        manager = await user({ permissions: ["schedule.configure", "appointments.manage"] })
        admin = await user({ isAdmin: true })
        scope = await createAppointmentScope(admin.id, "schedule_conflict_divergence")
    })

    beforeEach(async () => {
        today = getLocalParts(new Date()).dateStr
        changeDate = nextWeekdayFrom(addDaysToDateString(today, 9), 1)
        tuesdayInChange = addDaysToDateString(changeDate, 1)
        tuesdayToday = nextWeekdayFrom(addDaysToDateString(today, 1), TUESDAY)
        await clearScopeAppointments()
        await setNoticeEnabled(false)
        await useScheduleConfig({
            settings: {
                slot_minutes: 30,
                seats_per_slot: 2,
                window_days: 30,
                min_notice_days: 0,
                wait_alert_days: 7,
                unit_address: "Rua do Procon, 100",
                unit_address_complement: "Sala 1",
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
            await clearScopeAppointments()
            await deleteAppointmentScope(scope)
            await getPool().query("DELETE FROM AuditLog WHERE actor_user_id = ANY($1::bigint[])", [[manager.id, admin.id]])
            if (savedSnapshot) {
                await restoreScheduleConfig(savedSnapshot)
            }
            await restoreWhatsAppSettings()
            await deleteTestUsers(createdUserIds)
        } finally {
            await getPool().end()
        }
    })

    describe("salvar a configuração de hoje", () => {
        it("recusa com 409 SCHEDULE_CONFLICTS_CHANGED, sem alterar nada, quando entrou um afetado que a equipe não viu", async () => {
            const seen = await appointmentAt(tuesdayToday, "09:00")
            const entered = await appointmentAt(tuesdayToday, "10:00")

            const response = await putToday(
                bodyOf(WITHOUT_TUESDAY, {
                    conflictResolution: "CANCEL",
                    seenConflictIds: [seen],
                    seenNoticeEnabled: false,
                }),
            )

            expect(response.status).toBe(409)
            expect(response.body.error.code).toBe("SCHEDULE_CONFLICTS_CHANGED")
            expect(response.body.error.details.conflicts.map((conflict: { id: string }) => conflict.id).sort()).toEqual(
                [seen, entered].sort(),
            )
            expect(response.body.error.details.changes).toEqual(["CONFLICTS"])
            expect(await appointmentState(seen)).toEqual({ status: "CONFIRMED", offGrid: false })
            expect(await appointmentState(entered)).toEqual({ status: "CONFIRMED", offGrid: false })
            expect(await rangeWeekdays()).toEqual([1, 2, 3, 4, 5])
        })

        it("recusa com 409 SCHEDULE_CONFLICTS_CHANGED quando um agendamento visto deixou de ser afetado e ainda há outro afetado", async () => {
            const still = await appointmentAt(tuesdayToday, "09:00")

            const response = await putToday(
                bodyOf(WITHOUT_TUESDAY, {
                    conflictResolution: "CANCEL",
                    seenConflictIds: [still, UNKNOWN_APPOINTMENT_ID],
                    seenNoticeEnabled: false,
                }),
            )

            expect(response.status).toBe(409)
            expect(response.body.error.code).toBe("SCHEDULE_CONFLICTS_CHANGED")
            expect(response.body.error.details.conflicts).toEqual([expect.objectContaining({ id: still })])
            expect(await appointmentState(still)).toEqual({ status: "CONFIRMED", offGrid: false })
            expect(await rangeWeekdays()).toEqual([1, 2, 3, 4, 5])
        })

        it("recusa Manter com 409 SCHEDULE_CONFLICTS_CHANGED quando a lista mudou", async () => {
            const seen = await appointmentAt(tuesdayToday, "09:00")
            await appointmentAt(tuesdayToday, "10:00")

            const response = await putToday(
                bodyOf(WITHOUT_TUESDAY, { conflictResolution: "KEEP", seenConflictIds: [seen] }),
            )

            expect(response.status).toBe(409)
            expect(response.body.error.code).toBe("SCHEDULE_CONFLICTS_CHANGED")
            expect(await appointmentState(seen)).toEqual({ status: "CONFIRMED", offGrid: false })
        })

        it("recusa Cancelar com 409 só pelo aviso quando o aviso estava ligado e a equipe viu desligado", async () => {
            await setNoticeEnabled(true)
            const id = await appointmentAt(tuesdayToday)

            const response = await putToday(
                bodyOf(WITHOUT_TUESDAY, {
                    conflictResolution: "CANCEL",
                    seenConflictIds: [id],
                    seenNoticeEnabled: false,
                }),
            )

            expect(response.status).toBe(409)
            expect(response.body.error.code).toBe("SCHEDULE_CONFLICTS_CHANGED")
            expect(response.body.error.details.changes).toEqual(["NOTICE"])
            expect(response.body.error.details.cancellationNotice.enabled).toBe(true)
            expect(await appointmentState(id)).toEqual({ status: "CONFIRMED", offGrid: false })
        })

        it("recusa Cancelar com 409 só pelo aviso quando o aviso estava desligado e a equipe viu ligado", async () => {
            const id = await appointmentAt(tuesdayToday)

            const response = await putToday(
                bodyOf(WITHOUT_TUESDAY, {
                    conflictResolution: "CANCEL",
                    seenConflictIds: [id],
                    seenNoticeEnabled: true,
                }),
            )

            expect(response.status).toBe(409)
            expect(response.body.error.details.changes).toEqual(["NOTICE"])
            expect(response.body.error.details.cancellationNotice.enabled).toBe(false)
            expect(await appointmentState(id)).toEqual({ status: "CONFIRMED", offGrid: false })
        })

        it("aceita Manter mesmo com o aviso diferente do visto, porque o aviso não importa ao manter", async () => {
            await setNoticeEnabled(true)
            const id = await appointmentAt(tuesdayToday)

            const response = await putToday(
                bodyOf(WITHOUT_TUESDAY, { conflictResolution: "KEEP", seenConflictIds: [id] }),
            )

            expect(response.status).toBe(200)
            expect(response.body.resolution).toMatchObject({ action: "KEEP", affectedCount: 1 })
            expect(await appointmentState(id)).toEqual({ status: "CONFIRMED", offGrid: true })
        })

        it("cancela e grava quando a lista e o aviso são os que a equipe viu", async () => {
            const id = await appointmentAt(tuesdayToday)

            const response = await putToday(
                bodyOf(WITHOUT_TUESDAY, {
                    conflictResolution: "CANCEL",
                    seenConflictIds: [id],
                    seenNoticeEnabled: false,
                }),
            )

            expect(response.status).toBe(200)
            expect(response.body.resolution).toMatchObject({ action: "CANCEL", affectedCount: 1, noticeDisabled: true })
            expect(await appointmentState(id)).toEqual({ status: "CANCELED", offGrid: false })
            expect(await rangeWeekdays()).toEqual(WITHOUT_TUESDAY)
        })

        it("grava sem mexer em agendamento quando a lista refeita está vazia", async () => {
            const response = await putToday(
                bodyOf(WITHOUT_TUESDAY, {
                    conflictResolution: "CANCEL",
                    seenConflictIds: [UNKNOWN_APPOINTMENT_ID],
                    seenNoticeEnabled: false,
                }),
            )

            expect(response.status).toBe(200)
            expect(response.body.resolution).toMatchObject({ affectedCount: 0, notifiedCount: 0, failedCount: 0 })
            expect(await rangeWeekdays()).toEqual(WITHOUT_TUESDAY)
        })
    })

    describe("salvar uma mudança agendada", () => {
        it("recusa com 409 SCHEDULE_CONFLICTS_CHANGED, sem gravar a mudança, quando entrou um afetado que a equipe não viu", async () => {
            const seen = await appointmentAt(tuesdayInChange, "09:00")
            await appointmentAt(tuesdayInChange, "10:00")

            const response = await putVersion(
                changeDate,
                bodyOf(WITHOUT_TUESDAY, {
                    conflictResolution: "CANCEL",
                    seenConflictIds: [seen],
                    seenNoticeEnabled: false,
                }),
            )

            expect(response.status).toBe(409)
            expect(response.body.error.code).toBe("SCHEDULE_CONFLICTS_CHANGED")
            expect(await changeDates()).toEqual([])
            expect(await appointmentState(seen)).toEqual({ status: "CONFIRMED", offGrid: false })
        })

        it("recusa com 409 só pelo aviso quando o aviso mudou", async () => {
            const id = await appointmentAt(tuesdayInChange)

            const response = await putVersion(
                changeDate,
                bodyOf(WITHOUT_TUESDAY, {
                    conflictResolution: "CANCEL",
                    seenConflictIds: [id],
                    seenNoticeEnabled: true,
                }),
            )

            expect(response.status).toBe(409)
            expect(response.body.error.details.changes).toEqual(["NOTICE"])
            expect(await changeDates()).toEqual([])
        })

        it("cancela e grava a mudança quando a lista e o aviso são os que a equipe viu", async () => {
            const id = await appointmentAt(tuesdayInChange)

            const response = await putVersion(
                changeDate,
                bodyOf(WITHOUT_TUESDAY, {
                    conflictResolution: "CANCEL",
                    seenConflictIds: [id],
                    seenNoticeEnabled: false,
                }),
            )

            expect(response.status).toBe(200)
            expect(await changeDates()).toEqual([changeDate])
            expect(await appointmentState(id)).toEqual({ status: "CANCELED", offGrid: false })
        })
    })

    describe("cancelar uma mudança agendada", () => {
        const SATURDAY = 6

        async function scheduleChangeWithSaturday(): Promise<string> {
            await insertScheduleChange(changeDate, weekdayConfig([1, 2, 3, 4, 5, SATURDAY]), manager.id)
            return appointmentAt(addDaysToDateString(changeDate, 5))
        }

        it("recusa com 409 SCHEDULE_CONFLICTS_CHANGED, mantendo a mudança, quando a lista vista é diferente", async () => {
            const id = await scheduleChangeWithSaturday()

            const response = await deleteVersion(changeDate, {
                conflictResolution: "KEEP",
                seenConflictIds: [UNKNOWN_APPOINTMENT_ID],
            })

            expect(response.status).toBe(409)
            expect(response.body.error.code).toBe("SCHEDULE_CONFLICTS_CHANGED")
            expect(response.body.error.details.conflicts).toEqual([expect.objectContaining({ id })])
            expect(await changeDates()).toEqual([changeDate])
            expect(await appointmentState(id)).toEqual({ status: "CONFIRMED", offGrid: false })
        })

        it("recusa Cancelar com 409 só pelo aviso, mantendo a mudança, quando o aviso mudou", async () => {
            const id = await scheduleChangeWithSaturday()

            const response = await deleteVersion(changeDate, {
                conflictResolution: "CANCEL",
                seenConflictIds: [id],
                seenNoticeEnabled: true,
            })

            expect(response.status).toBe(409)
            expect(response.body.error.details.changes).toEqual(["NOTICE"])
            expect(await changeDates()).toEqual([changeDate])
            expect(await appointmentState(id)).toEqual({ status: "CONFIRMED", offGrid: false })
        })

        it("mantém os agendamentos, cancela a mudança e responde 200 quando a lista é a que a equipe viu", async () => {
            const id = await scheduleChangeWithSaturday()

            const response = await deleteVersion(changeDate, { conflictResolution: "KEEP", seenConflictIds: [id] })

            expect(response.status).toBe(200)
            expect(response.body.resolution).toMatchObject({ action: "KEEP", affectedCount: 1 })
            expect(await changeDates()).toEqual([])
            expect(await appointmentState(id)).toEqual({ status: "CONFIRMED", offGrid: true })
            expect(await appointmentEventTypes(id)).toContain("KEPT_OFF_GRID")
        })

        it("cancela os agendamentos e a mudança quando a lista e o aviso são os que a equipe viu", async () => {
            const id = await scheduleChangeWithSaturday()

            const response = await deleteVersion(changeDate, {
                conflictResolution: "CANCEL",
                seenConflictIds: [id],
                seenNoticeEnabled: false,
            })

            expect(response.status).toBe(200)
            expect(response.body.resolution).toMatchObject({ action: "CANCEL", affectedCount: 1, noticeDisabled: true })
            expect(await changeDates()).toEqual([])
            expect(await appointmentState(id)).toEqual({ status: "CANCELED", offGrid: false })
        })

        it("cancela a mudança sem mexer em agendamento quando a lista refeita está vazia", async () => {
            await insertScheduleChange(changeDate, weekdayConfig([1, 2, 3, 4, 5, SATURDAY]), manager.id)

            const response = await deleteVersion(changeDate, {
                conflictResolution: "CANCEL",
                seenConflictIds: [UNKNOWN_APPOINTMENT_ID],
                seenNoticeEnabled: false,
            })

            expect(response.status).toBe(200)
            expect(response.body.resolution).toMatchObject({ affectedCount: 0 })
            expect(await changeDates()).toEqual([])
        })
    })
})
