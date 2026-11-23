import { randomBytes } from "node:crypto"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import app from "../../app"
import getPool from "../../db/connection"
import type { AppointmentStatus } from "../../types/appointment.types"
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
const PERSONAL_KEYS = ["name", "cpfMasked", "cpf_hash", "cpfHash", "phone", "phone_encrypted", "id", "assignedUserId"]

interface BookedDayBody {
    date: string
    weekday: number
    total: number
    times: { time: string; count: number }[]
}

function nextWeekday(fromDays: number, targetDow: number): string {
    let curr = addDaysToDateString(getLocalParts(new Date()).dateStr, fromDays)
    while (new Date(`${curr}T12:00:00Z`).getUTCDay() !== targetDow) {
        curr = addDaysToDateString(curr, 1)
    }
    return curr
}

function keysOf(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value.flatMap(keysOf)
    }
    if (value !== null && typeof value === "object") {
        return Object.entries(value).flatMap(([key, inner]) => [key, ...keysOf(inner)])
    }
    return []
}

async function appointmentRows(ids: number[]): Promise<Record<string, unknown>[]> {
    const result = await getPool().query<Record<string, unknown>>(
        `SELECT id::text AS id, status, appointment_datetime::text AS appointment_datetime,
                assigned_user_id::text AS assigned_user_id, off_grid
         FROM Appointments
         WHERE id = ANY($1::bigint[])
         ORDER BY id`,
        [ids],
    )
    return result.rows
}

describe("Dias com agendamento e conflitos da prévia (Postgres)", () => {
    const createdUserIds: (number | null)[] = []
    let savedSnapshot: ScheduleConfigSnapshot | null = null
    let admin: TestUser
    let configurer: TestUser
    let scope: OwnedAppointmentScope

    async function appointment(
        status: AppointmentStatus,
        appointmentDatetime: Date,
        assignedUserId?: number,
    ): Promise<number> {
        return createTestAppointment(scope, {
            status,
            appointmentDatetime,
            assignedUserId,
            cpfHash: randomBytes(32).toString("hex"),
        })
    }

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
            ranges: [1, 2, 3, 4, 5].flatMap((weekday) => [
                { weekday, slot_index: 1, start_time: "08:00", end_time: "12:00" },
                { weekday, slot_index: 2, start_time: "13:00", end_time: "17:00" },
            ]),
        })
        admin = await createTestUser({ isAdmin: true })
        createdUserIds.push(admin.createdId)
        configurer = await createTestUser({ permissions: ["schedule.configure"] })
        createdUserIds.push(configurer.createdId)
        scope = await createAppointmentScope(admin.id, "schedule_booked_days")
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

    it("conta por data e hora de São Paulo só os pendentes e confirmados futuros da grade, sem dados pessoais", async () => {
        const first = nextWeekday(40, 2)
        const second = addDaysToDateString(first, 1)
        const late = addDaysToDateString(first, 2)
        await appointment("PENDING", parseLocalDate(first, "09:00"))
        await appointment("CONFIRMED", parseLocalDate(first, "09:00"), admin.id)
        await appointment("PENDING", parseLocalDate(first, "10:30"))
        await appointment("CANCELED", parseLocalDate(first, "11:00"))
        await appointment("ATTENDED", parseLocalDate(second, "09:00"), admin.id)
        await appointment("NO_SHOW", parseLocalDate(second, "09:30"), admin.id)
        const offGrid = await appointment("PENDING", parseLocalDate(second, "10:00"))
        await getPool().query("UPDATE Appointments SET off_grid = TRUE WHERE id = $1", [offGrid])
        await appointment("PENDING", parseLocalDate(late, "23:30"))
        const past = addDaysToDateString(getLocalParts(new Date()).dateStr, -3)
        await appointment("PENDING", parseLocalDate(past, "09:00"))
        const testDates = new Set([first, second, late, addDaysToDateString(late, 1), past])

        const response = await request(app)
            .get("/api/v1/schedule/booked-days")
            .set("Cookie", configurer.cookie)

        expect(response.status).toBe(200)
        expect(response.headers["cache-control"]).toBe("no-store")
        const days = (response.body.data.days as BookedDayBody[]).filter((day) => testDates.has(day.date))
        expect(days).toEqual([
            {
                date: first,
                weekday: 2,
                total: 3,
                times: [
                    { time: "09:00", count: 2 },
                    { time: "10:30", count: 1 },
                ],
            },
            { date: late, weekday: 4, total: 1, times: [{ time: "23:30", count: 1 }] },
        ])
        expect(keysOf(response.body).filter((key) => PERSONAL_KEYS.includes(key))).toEqual([])
    })

    it("responde 403 a quem só vê agendamentos e 401 sem sessão", async () => {
        const viewer = await createTestUser({ permissions: ["appointments.view"] })
        createdUserIds.push(viewer.createdId)

        const forbidden = await request(app).get("/api/v1/schedule/booked-days").set("Cookie", viewer.cookie)
        const unauthenticated = await request(app).get("/api/v1/schedule/booked-days")

        expect(forbidden.status).toBe(403)
        expect(forbidden.body.error.code).toBe("FORBIDDEN")
        expect(unauthenticated.status).toBe(401)
    })

    it("aponta na prévia do rascunho os mesmos conflitos do 409 do PUT, sem gravar nada", async () => {
        const wednesday = nextWeekday(50, 3)
        const id = await appointment("CONFIRMED", parseLocalDate(wednesday, "14:00"), admin.id)
        const current = (await request(app).get("/api/v1/schedule").set("Cookie", configurer.cookie)).body.data
        const draft = {
            slotMinutes: current.slotMinutes,
            seatsPerSlot: current.seatsPerSlot,
            windowDays: current.windowDays,
            minNoticeDays: current.minNoticeDays,
            waitAlertDays: current.waitAlertDays,
            unitAddress: current.unitAddress,
            unitAddressComplement: current.unitAddressComplement,
            reminderEnabled: current.reminderEnabled,
            reminderHours: current.reminderHours,
            ranges: [1, 2, 3, 4, 5].map((weekday) => ({ weekday, startTime: "08:00", endTime: "12:00" })),
            blockedDates: current.blockedDates,
        }
        const configBefore = await snapshotScheduleConfig()
        const appointmentsBefore = await appointmentRows([id])

        const preview = await request(app)
            .post("/api/v1/schedule/preview")
            .set("Cookie", configurer.cookie)
            .set("Origin", ORIGIN)
            .send({ month: wednesday.slice(0, 7), config: draft })

        expect(preview.status).toBe(200)
        expect(await snapshotScheduleConfig()).toEqual(configBefore)
        expect(await appointmentRows([id])).toEqual(appointmentsBefore)
        const own = (preview.body.data.conflicts as { date: string; time: string }[]).filter(
            (item) => item.date === wednesday && item.time === "14:00",
        )
        expect(own).toHaveLength(1)
        expect(keysOf(preview.body.data.conflicts).filter((key) => PERSONAL_KEYS.includes(key))).toEqual([])

        const saved = await request(app)
            .put("/api/v1/schedule")
            .set("Cookie", configurer.cookie)
            .set("Origin", ORIGIN)
            .send(draft)

        expect(saved.status).toBe(409)
        expect(saved.body.error.code).toBe("SCHEDULE_CONFLICTS")
        const fromPut = (
            saved.body.error.details.conflicts as {
                protocol: string
                date: string
                time: string
                code: string
                reason: string
            }[]
        ).map(({ protocol, date, time, code, reason }) => ({ protocol, date, time, code, reason }))
        const fromPreview = (
            preview.body.data.conflicts as {
                protocol: string
                date: string
                time: string
                code: string
                reason: string
            }[]
        ).map(({ protocol, date, time, code, reason }) => ({ protocol, date, time, code, reason }))
        expect(fromPreview).toEqual(fromPut)
        expect(own[0]).toMatchObject({ code: "RANGE_CHANGED", reason: "Faixa de horário removida ou alterada" })
    })
})
