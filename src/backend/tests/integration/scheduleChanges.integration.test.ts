import { randomBytes } from "node:crypto"
import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import app from "../../app"
import getPool from "../../db/connection"
import { scheduleRepository } from "../../repositories/schedule.repository"
import { sessionRepository } from "../../repositories/session.repository"
import { createScheduleService } from "../../services/schedule.service"
import { NormalizedScheduleConfig } from "../../types/schedule.types"
import { addDaysToDateString, getLocalParts, parseLocalDate } from "../../utils/date.utils"
import {
    createAppointmentScope,
    createTestAppointment,
    deleteAppointmentScope,
    OwnedAppointmentScope,
} from "./helpers/appointmentsDb"
import { hashPhone } from "./helpers/phone"
import {
    cleanupScheduleTestData,
    createTestQuestion,
    insertScheduleChange,
    restoreScheduleConfig,
    ScheduleConfigSnapshot,
    snapshotScheduleConfig,
    useScheduleConfig,
} from "./helpers/scheduleDb"
import { createTestUser, deleteTestUsers, TestUser } from "./helpers/usersDb"

const ORIGIN = process.env.FRONTEND_ORIGIN as string
const BOOKING_PHONE = "5512988881340"
const WITHOUT_TUESDAY = [1, 3, 4, 5]

function dayOfWeek(dateStr: string): number {
    return new Date(`${dateStr}T12:00:00Z`).getUTCDay()
}

function nextWeekdayFrom(dateStr: string, weekday: number): string {
    let curr = dateStr
    while (dayOfWeek(curr) !== weekday) {
        curr = addDaysToDateString(curr, 1)
    }
    return curr
}

function brDate(dateStr: string): string {
    return `${dateStr.slice(8, 10)}/${dateStr.slice(5, 7)}`
}

function rangesOn(weekdays: number[]) {
    return weekdays.map((weekday) => ({ weekday, slotIndex: 1, startTime: "08:00", endTime: "12:00" }))
}

function weekdayConfig(overrides: Partial<NormalizedScheduleConfig> = {}): NormalizedScheduleConfig {
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
        ranges: rangesOn([1, 2, 3, 4, 5]),
        blockedDates: [],
        ...overrides,
    }
}

function bodyOf(config: NormalizedScheduleConfig) {
    return {
        ...config,
        ranges: config.ranges.map(({ weekday, startTime, endTime }) => ({ weekday, startTime, endTime })),
    }
}

interface ChangeRow {
    effective_from: string
    config: NormalizedScheduleConfig
    updated_by: string
    updated_at: string
}

async function changeRows(): Promise<ChangeRow[]> {
    const result = await getPool().query<ChangeRow>(
        `SELECT to_char(effective_from, 'YYYY-MM-DD') AS effective_from, config, updated_by::text AS updated_by,
                updated_at::text AS updated_at
         FROM ScheduleChanges
         ORDER BY effective_from`,
    )
    return result.rows
}

describe("mudanças de horário agendadas com Postgres", () => {
    const createdUserIds: (number | null)[] = []
    let savedSnapshot: ScheduleConfigSnapshot | null = null
    let configurer: TestUser
    let author: TestUser
    let admin: TestUser
    let scope: OwnedAppointmentScope
    let today: string
    let changeDate: string
    let tuesdayBefore: string
    let tuesdayAfter: string

    async function appointmentAt(dateStr: string, time = "09:00"): Promise<number> {
        return createTestAppointment(scope, {
            status: "CONFIRMED",
            appointmentDatetime: parseLocalDate(dateStr, time),
            cpfHash: randomBytes(32).toString("hex"),
        })
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

    function putVersion(date: string, config: NormalizedScheduleConfig, as: TestUser = configurer): request.Test {
        return request(app)
            .put(`/api/v1/schedule/versions/${date}`)
            .set("Cookie", as.cookie)
            .set("Origin", ORIGIN)
            .send(bodyOf(config))
    }

    function deleteVersion(date: string): request.Test {
        return request(app)
            .delete(`/api/v1/schedule/versions/${date}`)
            .set("Cookie", configurer.cookie)
            .set("Origin", ORIGIN)
    }

    async function listedVersions(): Promise<string[]> {
        const response = await request(app).get("/api/v1/schedule/versions").set("Cookie", configurer.cookie)
        return response.body.data.map((version: { effectiveFrom: string }) => version.effectiveFrom)
    }

    async function user(input: Parameters<typeof createTestUser>[0]): Promise<TestUser> {
        const created = await createTestUser(input)
        createdUserIds.push(created.createdId)
        return created
    }

    beforeAll(async () => {
        savedSnapshot = await snapshotScheduleConfig()
        configurer = await user({ permissions: ["schedule.configure"] })
        author = await user({ permissions: ["schedule.configure"] })
        admin = await user({ isAdmin: true })
        scope = await createAppointmentScope(admin.id, "schedule_changes")
        await cleanupScheduleTestData({ phoneHashes: [hashPhone(BOOKING_PHONE)], appointmentIds: [] })
    })

    beforeEach(async () => {
        today = getLocalParts(new Date()).dateStr
        changeDate = nextWeekdayFrom(addDaysToDateString(today, 9), 1)
        tuesdayBefore = addDaysToDateString(changeDate, -6)
        tuesdayAfter = addDaysToDateString(changeDate, 1)
        await clearScopeAppointments()
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
            await cleanupScheduleTestData({ phoneHashes: [hashPhone(BOOKING_PHONE)], appointmentIds: [] })
            await deleteAppointmentScope(scope)
            if (savedSnapshot) {
                await restoreScheduleConfig(savedSnapshot)
            }
            await deleteTestUsers(createdUserIds)
        } finally {
            await getPool().end()
        }
    })

    it("grava a configuração de hoje como mudança nova a partir de hoje e mantém intacta a que já tinha começado", async () => {
        const yesterday = addDaysToDateString(today, -1)
        await insertScheduleChange(yesterday, weekdayConfig({ seatsPerSlot: 3 }), author.id)
        const [before] = await changeRows()

        const response = await request(app)
            .put("/api/v1/schedule")
            .set("Cookie", configurer.cookie)
            .set("Origin", ORIGIN)
            .send(bodyOf(weekdayConfig({ seatsPerSlot: 5 })))

        expect(response.status).toBe(200)
        expect(response.body.data).toMatchObject({ effectiveFrom: today, seatsPerSlot: 5 })
        const rows = await changeRows()
        expect(rows.map((row) => [row.effective_from, row.config.seatsPerSlot, row.updated_by])).toEqual([
            [yesterday, 3, String(author.id)],
            [today, 5, String(configurer.id)],
        ])
        expect(rows[0]).toEqual(before)
    })

    it("recusa com 400 no campo o bloqueio novo da configuração de hoje numa data que segue uma mudança distante", async () => {
        const farChange = addDaysToDateString(today, 250)
        await insertScheduleChange(farChange, weekdayConfig(), author.id)
        const blockedDate = addDaysToDateString(farChange, 10)

        const response = await request(app)
            .put("/api/v1/schedule")
            .set("Cookie", configurer.cookie)
            .set("Origin", ORIGIN)
            .send(bodyOf(weekdayConfig({
                blockedDates: [{ date: blockedDate, startTime: null, endTime: null, description: "Feriado" }],
            })))

        expect(response.status).toBe(400)
        expect(response.body.error.details.issues).toEqual([
            {
                path: "blockedDates.0.date",
                message: `Esta data segue a mudança de ${brDate(farChange)}. Bloqueie lá.`,
            },
        ])
        expect(await getPool().query("SELECT 1 FROM BlockedDates")).toMatchObject({ rowCount: 0 })
    })

    it("salva a mudança mesmo com agendamento antes da data de início que a nova grade não comporta", async () => {
        await appointmentAt(tuesdayBefore)

        const response = await putVersion(changeDate, weekdayConfig({ ranges: rangesOn(WITHOUT_TUESDAY) }))

        expect(response.status).toBe(200)
        expect(response.body.data.effectiveFrom).toBe(changeDate)
        expect(await listedVersions()).toEqual([changeDate])
    })

    it("recusa com 409 a mudança que não comporta agendamento na data de início ou depois, sem gravar nada", async () => {
        const id = await appointmentAt(tuesdayAfter)

        const response = await putVersion(changeDate, weekdayConfig({ ranges: rangesOn(WITHOUT_TUESDAY) }))

        expect(response.status).toBe(409)
        expect(response.body.error.code).toBe("SCHEDULE_CONFLICTS")
        expect(response.body.error.details.conflicts).toEqual([
            expect.objectContaining({ id: String(id), date: tuesdayAfter, code: "DAY_WITHOUT_SERVICE" }),
        ])
        expect(await listedVersions()).toEqual([])
    })

    it("confere a primeira de duas mudanças só até a véspera da seguinte", async () => {
        const secondChange = addDaysToDateString(changeDate, 14)
        await insertScheduleChange(secondChange, weekdayConfig(), author.id)
        await appointmentAt(addDaysToDateString(secondChange, 1))

        const response = await putVersion(changeDate, weekdayConfig({ ranges: rangesOn(WITHOUT_TUESDAY) }))

        expect(response.status).toBe(200)
        expect(await listedVersions()).toEqual([changeDate, secondChange])
    })

    it("substitui a cópia, o autor e o horário ao editar uma mudança que ainda não começou", async () => {
        await insertScheduleChange(changeDate, weekdayConfig({ seatsPerSlot: 3 }), author.id)
        await getPool().query("UPDATE ScheduleChanges SET updated_at = NOW() - INTERVAL '1 day'")
        const [before] = await changeRows()

        const response = await putVersion(changeDate, weekdayConfig({ seatsPerSlot: 4 }))

        const [after] = await changeRows()
        expect(response.status).toBe(200)
        expect(response.body.data.updatedBy).toEqual({ id: configurer.id, name: configurer.name })
        expect([after?.config.seatsPerSlot, after?.updated_by]).toEqual([4, String(configurer.id)])
        expect(new Date(after!.updated_at).getTime()).toBeGreaterThan(new Date(before!.updated_at).getTime())
    })

    it("recusa com 400 salvar ou cancelar uma mudança com a data de hoje", async () => {
        const saved = await putVersion(today, weekdayConfig())
        const canceled = await deleteVersion(today)

        expect([saved.status, canceled.status]).toEqual([400, 400])
        expect(await changeRows()).toEqual([])
    })

    it("responde 404 ao cancelar uma mudança que não existe", async () => {
        const response = await deleteVersion(changeDate)

        expect(response.status).toBe(404)
    })

    it("cancela com 204 a mudança que não deixa ninguém fora da versão anterior, e ela some da lista", async () => {
        await insertScheduleChange(changeDate, weekdayConfig({ ranges: rangesOn(WITHOUT_TUESDAY) }), author.id)
        await appointmentAt(tuesdayAfter)

        const response = await deleteVersion(changeDate)

        expect(response.status).toBe(204)
        expect(await listedVersions()).toEqual([])
    })

    it("recusa com 409 o cancelamento que deixaria um agendamento fora da versão anterior", async () => {
        await insertScheduleChange(changeDate, weekdayConfig({ ranges: rangesOn([1, 2, 3, 4, 5, 6]) }), author.id)
        const saturday = addDaysToDateString(changeDate, 5)
        const id = await appointmentAt(saturday)

        const response = await deleteVersion(changeDate)

        expect(response.status).toBe(409)
        expect(response.body.error.code).toBe("SCHEDULE_CONFLICTS")
        expect(response.body.error.details.conflicts).toEqual([
            expect.objectContaining({ id: String(id), date: saturday, code: "DAY_WITHOUT_SERVICE" }),
        ])
        expect(await listedVersions()).toEqual([changeDate])
    })

    it("usa a versão de cada data na consulta, no bot e na reserva, que devolve o endereço da mudança", async () => {
        await insertScheduleChange(
            changeDate,
            weekdayConfig({ ranges: rangesOn(WITHOUT_TUESDAY), unitAddress: "Rua Nova, 200", unitAddressComplement: null }),
            author.id,
        )
        const { questionId } = await createTestQuestion()
        const session = await sessionRepository.findOrCreateActive(hashPhone(BOOKING_PHONE))

        const before = await request(app)
            .get(`/api/v1/schedule/effective?date=${addDaysToDateString(changeDate, -1)}`)
            .set("Cookie", configurer.cookie)
        const after = await request(app)
            .get(`/api/v1/schedule/effective?date=${changeDate}`)
            .set("Cookie", configurer.cookie)
        const slots = await createScheduleService(scheduleRepository).getAvailableSlots(new Date())
        const booked = await scheduleRepository.bookAppointment({
            sessionId: session.id,
            questionId,
            reason: "REQUIRES_IN_PERSON",
            name: "Cidadão Mudança",
            cpfHash: "7".repeat(64),
            cpfMasked: "***.777.777-**",
            phone: BOOKING_PHONE,
            byRepresentative: false,
            appointmentDatetime: parseLocalDate(changeDate, "09:00"),
        })

        expect([before.body.data.effectiveFrom, after.body.data.effectiveFrom]).toEqual([null, changeDate])
        expect(slots.some((slot) => slot.dateStr === tuesdayBefore)).toBe(true)
        expect(slots.some((slot) => slot.dateStr === tuesdayAfter)).toBe(false)
        expect(booked.unitAddress).toBe("Rua Nova, 200")
    })

    it("recusa salvar e cancelar mudança sem a origem confiável, como os outros PUT do painel", async () => {
        const reference = await request(app).put("/api/v1/schedule").set("Cookie", configurer.cookie).send(bodyOf(weekdayConfig()))

        const saved = await request(app)
            .put(`/api/v1/schedule/versions/${changeDate}`)
            .set("Cookie", configurer.cookie)
            .send(bodyOf(weekdayConfig()))
        const canceled = await request(app).delete(`/api/v1/schedule/versions/${changeDate}`).set("Cookie", configurer.cookie)

        expect(reference.status).toBe(403)
        expect([saved.status, saved.body]).toEqual([reference.status, reference.body])
        expect([canceled.status, canceled.body]).toEqual([reference.status, reference.body])
        expect(await changeRows()).toEqual([])
    })
})
