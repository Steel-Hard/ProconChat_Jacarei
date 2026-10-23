import { randomBytes } from "node:crypto"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import app from "../../app"
import getPool from "../../db/connection"
import { scheduleRepository } from "../../repositories/schedule.repository"
import { createScheduleService } from "../../services/schedule.service"
import type { AppointmentStatus } from "../../types/appointment.types"
import type { Permission } from "../../types/auth.types"
import { addDaysToDateString, parseLocalDate, toLocalDateString } from "../../utils/date.utils"
import {
    createAppointmentScope,
    createTestAppointment,
    deleteAppointmentScope,
    OwnedAppointmentScope,
} from "./helpers/appointmentsDb"
import { restoreScheduleConfig, ScheduleConfigSnapshot, snapshotScheduleConfig, useScheduleConfig } from "./helpers/scheduleDb"
import { createTestUser, deleteTestUsers, TestUser } from "./helpers/usersDb"

const MANAGE: Permission[] = ["appointments.view", "appointments.manage"]
const WEEK_DATE = "2031-10-15"

interface CalendarItem {
    id: string
    protocol: string
    shortName: string
    date: string
    time: string
    status: string
    assigned_user_id: string | null
    off_grid: boolean
}

describe("Calendário semanal com Postgres", () => {
    const createdUserIds: (number | null)[] = []
    let admin: TestUser
    let viewer: TestUser
    let owner: TestUser
    let nobody: TestUser
    let scope: OwnedAppointmentScope
    let scheduleSnapshot: ScheduleConfigSnapshot
    const ids: Record<string, number> = {}

    async function appointment(
        status: AppointmentStatus,
        date: string,
        time: string,
        options: { owner?: TestUser; name?: string; offGrid?: boolean } = {},
    ): Promise<number> {
        const id = await createTestAppointment(scope, {
            status,
            name: options.name ?? "Cidadã Calendário",
            assignedUserId: status === "PENDING" || status === "CANCELED" ? null : (options.owner ?? owner).id,
            appointmentDatetime: parseLocalDate(date, time),
            cpfHash: randomBytes(32).toString("hex"),
        })
        if (options.offGrid) {
            await getPool().query("UPDATE Appointments SET off_grid = true WHERE id = $1", [id])
        }
        return id
    }

    async function calendar(query: string, user: TestUser = viewer): Promise<request.Response> {
        return request(app).get(`/api/v1/appointments/calendar?${query}`).set("Cookie", user.cookie)
    }

    function ours(items: CalendarItem[]): CalendarItem[] {
        const wanted = Object.values(ids).map(String)
        return items.filter((item) => wanted.includes(item.id))
    }

    beforeAll(async () => {
        admin = await createTestUser({ isAdmin: true })
        viewer = await createTestUser({ permissions: ["appointments.view"] })
        owner = await createTestUser({ permissions: MANAGE })
        nobody = await createTestUser({})
        createdUserIds.push(admin.createdId, viewer.id, owner.id, nobody.id)
        scope = await createAppointmentScope(admin.id, "calendar")
        scheduleSnapshot = await snapshotScheduleConfig()
        await useScheduleConfig({
            settings: {
                slot_minutes: 30,
                seats_per_slot: 2,
                window_days: 14,
                min_notice_days: 0,
                wait_alert_days: 7,
                unit_address: "Rua Teste, 1",
                unit_address_complement: null,
                reminder_enabled: false,
                reminder_hours: 24,
            },
            ranges: [1, 2, 3, 4, 5].map((weekday) => ({
                weekday,
                slot_index: 1,
                start_time: "08:00",
                end_time: "10:00",
            })),
            blockedDates: [
                { date: "2031-10-14", start_time: "08:00", end_time: "09:00", description: "Reunião interna" },
                { date: "2031-10-17", start_time: null, end_time: null, description: "Feriado municipal" },
            ],
        })
        ids.pending = await appointment("PENDING", "2031-10-15", "08:30", { name: "Joana Maria da Silva" })
        ids.confirmed = await appointment("CONFIRMED", "2031-10-15", "09:00", { name: "Pedro Souza" })
        ids.canceled = await appointment("CANCELED", "2031-10-16", "08:00", { name: "Ana Lima" })
        ids.offGrid = await appointment("CONFIRMED", "2031-10-16", "08:45", { name: "Caio Reis", offGrid: true })
        ids.otherWeek = await appointment("PENDING", "2031-10-20", "08:00", { name: "Fora Da Semana" })
    })

    afterAll(async () => {
        await restoreScheduleConfig(scheduleSnapshot)
        await deleteAppointmentScope(scope)
        await deleteTestUsers(createdUserIds)
        await getPool().end()
    })

    it("devolve a semana de domingo a sábado, só com os dias da grade, e o dia inicial", async () => {
        const res = await calendar(`date=${WEEK_DATE}`)

        expect(res.status).toBe(200)
        expect(res.body.data.weekStart).toBe("2031-10-12")
        expect(res.body.data.weekEnd).toBe("2031-10-18")
        expect(res.body.data.weekStartDay).toBe(0)
        expect(res.body.data.days.map((day: { date: string }) => day.date)).toEqual([
            "2031-10-13",
            "2031-10-14",
            "2031-10-15",
            "2031-10-16",
            "2031-10-17",
        ])
        expect(res.body.data.days[0].slots.map((slot: { time: string }) => slot.time)).toEqual(["08:00", "08:30", "09:00", "09:30"])
    })

    it("descreve os bloqueios de período e de dia inteiro", async () => {
        const res = await calendar(`date=${WEEK_DATE}`)

        const byDate = new Map(res.body.data.days.map((day: { date: string }) => [day.date, day]))
        expect((byDate.get("2031-10-14") as { blocked: unknown }).blocked).toEqual({
            fullDay: false,
            description: null,
            periods: [{ start: "08:00", end: "09:00", description: "Reunião interna" }],
        })
        expect((byDate.get("2031-10-17") as { blocked: unknown }).blocked).toEqual({
            fullDay: true,
            description: "Feriado municipal",
            periods: [],
        })
    })

    it("com status Todos traz os agendamentos da semana, inclusive cancelados e fora da grade na hora deles", async () => {
        const res = await calendar(`date=${WEEK_DATE}`)

        expect(ours(res.body.data.appointments)).toEqual([
            expect.objectContaining({ id: String(ids.pending), shortName: "Joana", date: "2031-10-15", time: "08:30", status: "PENDING" }),
            expect.objectContaining({
                id: String(ids.confirmed),
                shortName: "Pedro",
                time: "09:00",
                status: "CONFIRMED",
                assigned_user_id: String(owner.id),
            }),
            expect.objectContaining({ id: String(ids.canceled), date: "2031-10-16", time: "08:00", status: "CANCELED" }),
            expect.objectContaining({ id: String(ids.offGrid), time: "08:45", off_grid: true }),
        ])
        for (const item of res.body.data.appointments) {
            expect(Object.keys(item).sort()).toEqual([
                "assigned_user_id",
                "date",
                "id",
                "off_grid",
                "protocol",
                "shortName",
                "status",
                "time",
            ])
        }
    })

    it("respeita os filtros de status e de responsável da lista", async () => {
        const pending = await calendar(`date=${WEEK_DATE}&status=PENDING`)
        const mine = await calendar(`date=${WEEK_DATE}&responsible=${owner.id}`)
        const unassigned = await calendar(`date=${WEEK_DATE}&responsible=unassigned`)

        expect(ours(pending.body.data.appointments).map((item) => item.id)).toEqual([String(ids.pending)])
        expect(ours(mine.body.data.appointments).map((item) => item.id)).toEqual([String(ids.confirmed), String(ids.offGrid)])
        expect(ours(unassigned.body.data.appointments).map((item) => item.id)).toEqual([String(ids.pending)])
    })

    it("nunca devolve CPF, telefone nem o nome completo", async () => {
        const res = await calendar(`date=${WEEK_DATE}`)

        const text = JSON.stringify(res.body)
        expect(text).not.toContain("Joana Maria da Silva")
        expect(text).not.toContain("cpf")
        expect(text).not.toContain("phone")
    })

    it("freeSeats é igual às vagas que o bot oferece na semana que vem", async () => {
        const nextWeek = addDaysToDateString(toLocalDateString(new Date()), 7)
        const offered = new Map(
            (await createScheduleService(scheduleRepository).getAvailableSlots(new Date())).map((slot) => [
                `${slot.dateStr} ${slot.timeStr}`,
                slot.remainingSeats,
            ]),
        )

        const res = await calendar(`date=${nextWeek}`)

        const cells = res.body.data.days.flatMap((day: { date: string; slots: { time: string; freeSeats: number | null }[] }) =>
            day.slots.map((slot) => ({ key: `${day.date} ${slot.time}`, freeSeats: slot.freeSeats })),
        )
        expect(cells.length).toBeGreaterThan(0)
        for (const cell of cells) {
            expect(cell.freeSeats).toBe(offered.get(cell.key) ?? null)
        }
    })

    it("sem configuração de agenda, days vem vazio e os agendamentos continuam", async () => {
        await getPool().query("DELETE FROM ScheduleRanges")
        await getPool().query("DELETE FROM ScheduleSettings")

        const res = await calendar(`date=${WEEK_DATE}`)

        expect(res.body.data.days).toEqual([])
        expect(ours(res.body.data.appointments)).toHaveLength(4)
    })

    it("recusa data inválida com 400 e a conta sem Ver agendamentos com 403", async () => {
        const invalid = await calendar("date=2031-02-30")
        const forbidden = await calendar(`date=${WEEK_DATE}`, nobody)

        expect(invalid.status).toBe(400)
        expect(forbidden.status).toBe(403)
        expect(forbidden.body.error.code).toBe("FORBIDDEN")
    })
})
