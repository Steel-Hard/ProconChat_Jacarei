import { randomBytes } from "node:crypto"
import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import app from "../../app"
import getPool from "../../db/connection"
import { scheduleRepository } from "../../repositories/schedule.repository"
import { NormalizedScheduleConfig } from "../../types/schedule.types"
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
import { createTestUser, deleteTestUsers, TestUser } from "./helpers/usersDb"

const ORIGIN = process.env.FRONTEND_ORIGIN as string
const TUESDAY = 2
const WEDNESDAY = 3
const THURSDAY = 4
const WITHOUT_TUESDAY = [1, 3, 4, 5]
const INVALID_SEATS_PER_SLOT = 0

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

function weekdayConfig(
    weekdays: number[],
    overrides: Partial<NormalizedScheduleConfig> = {},
): NormalizedScheduleConfig {
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
        ...overrides,
    }
}

function bodyOf(config: NormalizedScheduleConfig, extra: Record<string, unknown> = {}) {
    return {
        ...config,
        ranges: config.ranges.map(({ weekday, startTime, endTime }) => ({ weekday, startTime, endTime })),
        ...extra,
    }
}

interface EventRow {
    type: string
    data: Record<string, unknown>
}

describe("regras de resolução de conflitos da agenda com Postgres", () => {
    const createdUserIds: (number | null)[] = []
    let savedSnapshot: ScheduleConfigSnapshot | null = null
    let originalWhatsAppSettings: Record<string, unknown> | undefined
    let manager: TestUser
    let admin: TestUser
    let scope: OwnedAppointmentScope
    let today: string
    let tuesdayDate: string
    let wednesdayDate: string
    let thursdayDate: string

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

    async function setNoticeDisabled(): Promise<void> {
        await getPool().query("DELETE FROM WhatsAppSettings")
        await getPool().query(
            `INSERT INTO WhatsAppSettings (id, verify_token, updated_by, updated_at, cancellation_notice_enabled)
             VALUES (1, $1, $2, NOW(), FALSE)`,
            ["c".repeat(64), manager.id],
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

    async function eventsOf(id: string): Promise<EventRow[]> {
        const result = await getPool().query<EventRow>(
            "SELECT type, data FROM AppointmentEvents WHERE appointment_id = $1 ORDER BY id",
            [id],
        )
        return result.rows
    }

    async function appointmentState(id: string): Promise<{ status: string; offGrid: boolean }> {
        const result = await getPool().query<{ status: string; off_grid: boolean }>(
            "SELECT status, off_grid FROM Appointments WHERE id = $1",
            [id],
        )
        return { status: result.rows[0]!.status, offGrid: result.rows[0]!.off_grid }
    }

    async function savedSeatsPerSlot(): Promise<number> {
        const result = await getPool().query<{ seats_per_slot: number }>(
            "SELECT seats_per_slot FROM ScheduleSettings WHERE id = 1",
        )
        return result.rows[0]!.seats_per_slot
    }

    function putToday(body: object): request.Test {
        return request(app).put("/api/v1/schedule").set("Cookie", manager.cookie).set("Origin", ORIGIN).send(body)
    }

    beforeAll(async () => {
        savedSnapshot = await snapshotScheduleConfig()
        originalWhatsAppSettings = (
            await getPool().query<Record<string, unknown>>("SELECT * FROM WhatsAppSettings WHERE id = 1")
        ).rows[0]
        manager = await user({ permissions: ["schedule.configure", "appointments.manage"] })
        admin = await user({ isAdmin: true })
        scope = await createAppointmentScope(admin.id, "schedule_conflict_resolution")
    })

    beforeEach(async () => {
        today = getLocalParts(new Date()).dateStr
        tuesdayDate = nextWeekdayFrom(addDaysToDateString(today, 1), TUESDAY)
        wednesdayDate = nextWeekdayFrom(addDaysToDateString(today, 1), WEDNESDAY)
        thursdayDate = nextWeekdayFrom(addDaysToDateString(today, 1), THURSDAY)
        await clearScopeAppointments()
        await setNoticeDisabled()
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

    describe("motivo do cancelamento", () => {
        it("registra Unidade fechada para data bloqueada e para período bloqueado, e Outro motivo para os demais", async () => {
            const onClosedDate = await appointmentAt(wednesdayDate, "09:00")
            const inClosedPeriod = await appointmentAt(thursdayDate, "09:00")
            const onDayWithoutService = await appointmentAt(tuesdayDate, "09:00")
            const config = weekdayConfig(WITHOUT_TUESDAY, {
                blockedDates: [
                    { date: wednesdayDate, startTime: null, endTime: null, description: "Feriado" },
                    { date: thursdayDate, startTime: "08:00", endTime: "10:00", description: "Reunião" },
                ],
            })

            const response = await putToday(
                bodyOf(config, {
                    conflictResolution: "CANCEL",
                    seenConflictIds: [onClosedDate, inClosedPeriod, onDayWithoutService],
                    seenNoticeEnabled: false,
                }),
            )

            expect(response.status).toBe(200)
            const reasonOf = async (id: string) =>
                (await eventsOf(id)).find((event) => event.type === "CANCELED_BY_STAFF")?.data.reason
            expect(await reasonOf(onClosedDate)).toBe("UNIT_CLOSED")
            expect(await reasonOf(inClosedPeriod)).toBe("UNIT_CLOSED")
            expect(await reasonOf(onDayWithoutService)).toBe("OTHER")
        })
    })

    describe("aviso ao cidadão desligado", () => {
        it("registra o cidadão não avisado no histórico de cada agendamento cancelado", async () => {
            const first = await appointmentAt(tuesdayDate, "09:00")
            const second = await appointmentAt(tuesdayDate, "10:00")

            const response = await putToday(
                bodyOf(weekdayConfig(WITHOUT_TUESDAY), {
                    conflictResolution: "CANCEL",
                    seenConflictIds: [first, second],
                    seenNoticeEnabled: false,
                }),
            )

            expect(response.status).toBe(200)
            expect(response.body.resolution).toMatchObject({
                affectedCount: 2,
                notifiedCount: 0,
                failedCount: 0,
                noticeDisabled: true,
            })
            for (const id of [first, second]) {
                const events = await eventsOf(id)
                expect(events.map((event) => event.type)).toEqual(["CANCELED_BY_STAFF", "CITIZEN_NOTICE_DISABLED"])
                expect(events[1]?.data).toEqual({ kind: "CANCELLATION" })
            }
        })
    })

    describe("agendamentos mantidos", () => {
        it("marca fora da grade, registra no histórico e não aponta de novo numa mudança seguinte", async () => {
            const id = await appointmentAt(tuesdayDate)

            const kept = await putToday(
                bodyOf(weekdayConfig(WITHOUT_TUESDAY), { conflictResolution: "KEEP", seenConflictIds: [id] }),
            )
            const savedAgain = await putToday(bodyOf(weekdayConfig(WITHOUT_TUESDAY, { seatsPerSlot: 3 })))

            expect(kept.status).toBe(200)
            expect(await appointmentState(id)).toEqual({ status: "CONFIRMED", offGrid: true })
            expect((await eventsOf(id)).map((event) => event.type)).toEqual(["KEPT_OFF_GRID"])
            expect(savedAgain.status).toBe(200)
        })
    })

    describe("gravação conjunta", () => {
        it("desfaz os cancelamentos, o histórico e a agenda quando a gravação falha depois deles", async () => {
            const first = await appointmentAt(tuesdayDate, "09:00")
            const second = await appointmentAt(tuesdayDate, "10:00")
            const invalidConfig = weekdayConfig(WITHOUT_TUESDAY, { seatsPerSlot: INVALID_SEATS_PER_SLOT })

            await expect(
                scheduleRepository.saveConfig({
                    config: invalidConfig,
                    actorUserId: manager.id,
                    now: new Date(),
                    conflictResolution: "CANCEL",
                    seenConflictIds: [first, second],
                    seenNoticeEnabled: false,
                }),
            ).rejects.toThrow()

            expect(await appointmentState(first)).toEqual({ status: "CONFIRMED", offGrid: false })
            expect(await appointmentState(second)).toEqual({ status: "CONFIRMED", offGrid: false })
            expect(await eventsOf(first)).toEqual([])
            expect(await eventsOf(second)).toEqual([])
            expect(await savedSeatsPerSlot()).toBe(2)
        })
    })
})
