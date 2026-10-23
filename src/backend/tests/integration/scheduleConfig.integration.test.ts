import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import app from "../../app"
import getPool from "../../db/connection"
import { scheduleRepository } from "../../repositories/schedule.repository"
import { sessionRepository } from "../../repositories/session.repository"
import { createScheduleService } from "../../services/schedule.service"
import { addDaysToDateString, getLocalParts, parseLocalDate } from "../../utils/date.utils"
import { hashPhone as phoneHash } from "./helpers/phone"
import {
    cleanupScheduleTestData,
    createTestQuestion,
    restoreScheduleConfig,
    ScheduleConfigSnapshot,
    ScheduleRangeInput,
    ScheduleSettingsInput,
    snapshotScheduleConfig,
    useScheduleConfig,
} from "./helpers/scheduleDb"
import { createTestUser, deleteTestUsers, TestUser } from "./helpers/usersDb"

const ORIGIN = process.env.FRONTEND_ORIGIN as string

const initialSettings: ScheduleSettingsInput = {
    slot_minutes: 30,
    seats_per_slot: 2,
    window_days: 30,
    min_notice_days: 1,
    wait_alert_days: 7,
    unit_address: "Rua do Procon, 100",
    unit_address_complement: "Sala 1",
    reminder_enabled: true,
    reminder_hours: 24,
}

const initialRanges: ScheduleRangeInput[] = [1, 2, 3, 4, 5].flatMap((weekday) => [
    { weekday, slot_index: 1, start_time: "08:00", end_time: "12:00" },
    { weekday, slot_index: 2, start_time: "13:00", end_time: "17:00" },
])

function nextWeekdayDateStr(fromDateStr: string, targetDow: number): string {
    let curr = addDaysToDateString(fromDateStr, 2)
    for (let i = 0; i < 14; i++) {
        const [y, m, d] = curr.split("-").map(Number)
        const dow = new Date(Date.UTC(y!, m! - 1, d!, 12, 0, 0)).getUTCDay()
        if (dow === targetDow) {
            return curr
        }
        curr = addDaysToDateString(curr, 1)
    }
    return curr
}

describe("Schedule config & preview integration tests (Postgres)", () => {
    const createdUserIds: (number | null)[] = []
    const createdAppointmentIds: string[] = []
    const testPhone = "5512988887777"
    let savedSnapshot: ScheduleConfigSnapshot | null = null
    let configurer: TestUser
    let viewer: TestUser
    let testQuestionId: number

    async function user(input: Parameters<typeof createTestUser>[0]): Promise<TestUser> {
        const created = await createTestUser(input)
        createdUserIds.push(created.createdId)
        return created
    }

    beforeAll(async () => {
        await cleanupScheduleTestData({
            phoneHashes: [phoneHash(testPhone)],
            appointmentIds: [],
        })
        savedSnapshot = await snapshotScheduleConfig()
        await useScheduleConfig({
            settings: {
                slot_minutes: initialSettings.slot_minutes,
                seats_per_slot: initialSettings.seats_per_slot,
                window_days: initialSettings.window_days,
                min_notice_days: initialSettings.min_notice_days,
                wait_alert_days: initialSettings.wait_alert_days,
                unit_address: initialSettings.unit_address,
                unit_address_complement: initialSettings.unit_address_complement,
                reminder_enabled: initialSettings.reminder_enabled,
                reminder_hours: initialSettings.reminder_hours,
            },
            ranges: initialRanges,
            blockedDates: [],
        })

        configurer = await user({ permissions: ["schedule.configure"] })
        viewer = await user({ permissions: ["appointments.view"] })
        const q = await createTestQuestion()
        testQuestionId = q.questionId
    })

    afterAll(async () => {
        try {
            await cleanupScheduleTestData({
                phoneHashes: [phoneHash(testPhone)],
                appointmentIds: createdAppointmentIds,
            })
        } finally {
            try {
                if (savedSnapshot) {
                    await restoreScheduleConfig(savedSnapshot)
                }
                await deleteTestUsers(createdUserIds)
            } finally {
                await getPool().end()
            }
        }
    })

    it("restringe acesso às rotas de /api/v1/schedule a quem tem schedule.configure", async () => {
        const unauth = await request(app).get("/api/v1/schedule")
        expect(unauth.status).toBe(401)

        const forbidden = await request(app)
            .get("/api/v1/schedule")
            .set("Cookie", viewer.cookie)
        expect(forbidden.status).toBe(403)

        const allowed = await request(app)
            .get("/api/v1/schedule")
            .set("Cookie", configurer.cookie)
        expect(allowed.status).toBe(200)
        expect(allowed.body.data.slotMinutes).toBe(30)
    })

    it("salva nova configuração em PUT /api/v1/schedule, registra autor e reflete imediatamente no cálculo de vagas e prévia", async () => {
        const todayStr = getLocalParts(new Date()).dateStr
        const targetTuesday = nextWeekdayDateStr(todayStr, 2)

        const putRes = await request(app)
            .put("/api/v1/schedule")
            .set("Cookie", configurer.cookie)
            .set("Origin", ORIGIN)
            .send({
                slotMinutes: 60,
                seatsPerSlot: 3,
                windowDays: 14,
                minNoticeDays: 1,
                waitAlertDays: 5,
                unitAddress: "Av. Nove de Julho, 215 - Centro",
                unitAddressComplement: "Térreo",
                reminderEnabled: true,
                reminderHours: 12,
                ranges: [
                    { weekday: 1, startTime: "08:00", endTime: "12:00" },
                    { weekday: 2, startTime: "09:00", endTime: "12:00" },
                    { weekday: 3, startTime: "08:00", endTime: "12:00" },
                    { weekday: 4, startTime: "08:00", endTime: "12:00" },
                    { weekday: 5, startTime: "08:00", endTime: "12:00" },
                ],
                blockedDates: [
                    {
                        date: targetTuesday,
                        startTime: "10:00",
                        endTime: "11:00",
                        description: "Reunião de equipe",
                    },
                ],
            })

        expect(putRes.status).toBe(200)
        expect(putRes.body.data).toMatchObject({
            slotMinutes: 60,
            seatsPerSlot: 3,
            windowDays: 14,
            minNoticeDays: 1,
            waitAlertDays: 5,
            unitAddress: "Av. Nove de Julho, 215 - Centro",
            unitAddressComplement: "Térreo",
            reminderEnabled: true,
            reminderHours: 12,
            updatedBy: { id: configurer.id, name: configurer.name },
        })
        expect(putRes.body.data.updatedAt).toEqual(expect.any(String))

        const service = createScheduleService(scheduleRepository)
        const botSlots = await service.getAvailableSlots(new Date())
        const tuesdaySlots = botSlots.filter((s) => s.dateStr === targetTuesday)
        expect(tuesdaySlots.map((s) => s.timeStr)).toEqual(["09:00", "11:00"])
        expect(tuesdaySlots[0]?.remainingSeats).toBe(3)

        const targetMonth = targetTuesday.slice(0, 7)
        const previewRes = await request(app)
            .get(`/api/v1/schedule/preview?month=${targetMonth}`)
            .set("Cookie", configurer.cookie)

        expect(previewRes.status).toBe(200)
        const previewDay = previewRes.body.data.days.find(
            (d: { date: string }) => d.date === targetTuesday,
        )
        expect(previewDay).toBeDefined()
        expect(previewDay.slots.map((s: { time: string }) => s.time)).toEqual([
            "09:00",
            "11:00",
        ])
    })

    it("detecta conflito com agendamento futuro ativo em PUT /api/v1/schedule, retorna 409 SCHEDULE_CONFLICTS e faz rollback", async () => {
        const todayStr = getLocalParts(new Date()).dateStr
        const targetWednesday = nextWeekdayDateStr(todayStr, 3)
        const apptDatetime = parseLocalDate(targetWednesday, "09:00")

        const session = await sessionRepository.findOrCreateActive(phoneHash(testPhone))
        const booked = await scheduleRepository.bookAppointment({
            sessionId: session.id,
            questionId: testQuestionId,
            reason: "REQUIRES_IN_PERSON",
            name: "Cidadão Conflito Agenda",
            cpfHash: "7".repeat(64),
            cpfMasked: "***.777.777-**",
            phone: testPhone,
            byRepresentative: false,
            appointmentDatetime: apptDatetime,
        })
        createdAppointmentIds.push(booked.id)

        const currentRes = await request(app)
            .get("/api/v1/schedule")
            .set("Cookie", configurer.cookie)
        const current = currentRes.body.data

        const conflictRes = await request(app)
            .put("/api/v1/schedule")
            .set("Cookie", configurer.cookie)
            .set("Origin", ORIGIN)
            .send({
                ...current,
                slotMinutes: 20,
                blockedDates: [
                    ...current.blockedDates,
                    {
                        date: targetWednesday,
                        startTime: null,
                        endTime: null,
                        description: "Feriado Extraordinário",
                    },
                ],
            })

        expect(conflictRes.status).toBe(409)
        expect(conflictRes.body.error.code).toBe("SCHEDULE_CONFLICTS")
        expect(conflictRes.body.error.details.conflicts).toEqual([
            expect.objectContaining({
                id: booked.id,
                protocol: booked.protocol,
                name: "Cidadão Conflito Agenda",
                date: targetWednesday,
                time: "09:00",
                code: "DATE_BLOCKED",
                reason: "Data bloqueada: Feriado Extraordinário",
            }),
        ])

        const afterRes = await request(app)
            .get("/api/v1/schedule")
            .set("Cookie", configurer.cookie)
        expect(afterRes.body.data.slotMinutes).toBe(60)

        await getPool().query("UPDATE Appointments SET off_grid = TRUE WHERE id = $1", [
            booked.id,
        ])

        const allowedAfterOffGrid = await request(app)
            .put("/api/v1/schedule")
            .set("Cookie", configurer.cookie)
            .set("Origin", ORIGIN)
            .send({
                ...current,
                blockedDates: [
                    ...current.blockedDates,
                    {
                        date: targetWednesday,
                        startTime: null,
                        endTime: null,
                        description: "Feriado Extraordinário",
                    },
                ],
            })

        expect(allowedAfterOffGrid.status).toBe(200)
    })
})
