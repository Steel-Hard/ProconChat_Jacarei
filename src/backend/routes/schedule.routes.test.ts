import express from "express"
import request from "supertest"
import { beforeEach, describe, expect, it } from "vitest"
import { createRequireAuth } from "../middleware/auth.middleware"
import errorHandler from "../middleware/errorHandler.middleware"
import { MockAuthRepository } from "../repositories/mock/authMock.repository"
import {
    buildDefaultScheduleConfigView,
    createScheduleStubRepository,
} from "../repositories/mock/scheduleStub.repository"
import { sessionTokens } from "../utils/sessionToken"
import { ScheduleRoutes } from "./schedule.routes"

const ADMIN_ID = 1
const CONFIGURER_ID = 2
const VIEWER_ID = 3

const authUsers = new MockAuthRepository([
    {
        id: ADMIN_ID,
        email: "admin@exemplo.test",
        passwordHash: "x",
        name: "Marcos Costa",
        isAdmin: true,
    },
    {
        id: CONFIGURER_ID,
        email: "patricia@exemplo.test",
        passwordHash: "x",
        name: "Patrícia Lima",
        permissions: ["schedule.configure"],
    },
    {
        id: VIEWER_ID,
        email: "lucas@exemplo.test",
        passwordHash: "x",
        name: "Lucas",
        permissions: ["appointments.view"],
    },
])

function cookieOf(userId: number): string {
    return `proconchat_access=${sessionTokens.signAccessToken({ userId, sessionVersion: 0 })}`
}

describe("schedule.routes (HTTP)", () => {
    let repository: ReturnType<typeof createScheduleStubRepository>
    let app: express.Express

    beforeEach(() => {
        repository = createScheduleStubRepository()
        const authMiddleware = createRequireAuth({
            users: authUsers,
            tokens: sessionTokens,
        })
        app = express()
        app.use(express.json())
        app.use(
            "/api/v1/schedule",
            new ScheduleRoutes({ repository, authMiddleware }).getRouter(),
        )
        app.use(errorHandler)
    })

    const routes = [
        ["get", "/api/v1/schedule"],
        ["put", "/api/v1/schedule"],
        ["get", "/api/v1/schedule/preview"],
        ["post", "/api/v1/schedule/preview"],
    ] as const

    it.each(routes)("responde 401 em %s %s sem autenticação", async (method, path) => {
        const response = await request(app)[method](path)

        expect(response.status).toBe(401)
        expect(response.body.error.code).toBe("UNAUTHORIZED")
    })

    it.each(routes)(
        "responde 403 FORBIDDEN em %s %s sem permissão schedule.configure",
        async (method, path) => {
            const response = await request(app)[method](path)
                .set("Cookie", cookieOf(VIEWER_ID))
                .send({})

            expect(response.status).toBe(403)
            expect(response.body).toEqual({
                error: { code: "FORBIDDEN", message: "Insufficient permission" },
            })
        },
    )

    it("retorna a configuração atual em GET /api/v1/schedule com Cache-Control no-store", async () => {
        const response = await request(app)
            .get("/api/v1/schedule")
            .set("Cookie", cookieOf(CONFIGURER_ID))

        expect(response.status).toBe(200)
        expect(response.headers["cache-control"]).toBe("no-store")
        expect(response.body.data).toMatchObject({
            slotMinutes: 30,
            seatsPerSlot: 2,
            windowDays: 30,
            minNoticeDays: 1,
            waitAlertDays: 7,
            unitAddress: "Av. Nove de Julho, 215 - Centro, Jacareí - SP",
            reminderEnabled: true,
            reminderHours: 24,
            updatedBy: { id: 1, name: "Marcos Costa" },
        })
    })

    it("atualiza a configuração em PUT /api/v1/schedule e registra o autor da alteração", async () => {
        const base = buildDefaultScheduleConfigView()
        const response = await request(app)
            .put("/api/v1/schedule")
            .set("Cookie", cookieOf(CONFIGURER_ID))
            .send({
                slotMinutes: 60,
                seatsPerSlot: 3,
                windowDays: 45,
                minNoticeDays: 2,
                waitAlertDays: 10,
                unitAddress: "Rua Nova, 500 - Centro",
                unitAddressComplement: null,
                reminderEnabled: false,
                reminderHours: 12,
                ranges: base.ranges,
                blockedDates: [
                    {
                        date: "2027-12-25",
                        startTime: null,
                        endTime: null,
                        description: "Natal",
                    },
                ],
            })

        expect(response.status).toBe(200)
        expect(response.body.data).toMatchObject({
            slotMinutes: 60,
            seatsPerSlot: 3,
            windowDays: 45,
            minNoticeDays: 2,
            waitAlertDays: 10,
            unitAddress: "Rua Nova, 500 - Centro",
            unitAddressComplement: null,
            reminderEnabled: false,
            reminderHours: 12,
            blockedDates: [
                {
                    date: "2027-12-25",
                    startTime: null,
                    endTime: null,
                    description: "Natal",
                },
            ],
            updatedBy: { id: CONFIGURER_ID, name: "Patrícia Lima" },
        })
    })

    it("aceita PUT /api/v1/schedule sem nenhuma faixa quando não há agendamentos futuros", async () => {
        const base = buildDefaultScheduleConfigView()
        const { updatedBy: _updatedBy, updatedAt: _updatedAt, ...body } = base

        const response = await request(app)
            .put("/api/v1/schedule")
            .set("Cookie", cookieOf(CONFIGURER_ID))
            .send({ ...body, ranges: [] })

        expect(response.status).toBe(200)
        expect(response.body.data.ranges).toEqual([])
    })

    it("responde 409 SCHEDULE_CONFLICTS em PUT /api/v1/schedule quando há agendamento futuro afetado", async () => {
        repository.setAppointments([
            {
                id: "42",
                protocol: "ABCD1234",
                name: "Ana Beatriz",
                cpfMasked: "***.123.456-**",
                appointmentDatetime: new Date("2027-11-03T08:00:00-03:00"),
                requestDatetime: new Date("2026-10-01T10:00:00-03:00"),
                status: "CONFIRMED",
            },
        ])

        const base = buildDefaultScheduleConfigView()
        const response = await request(app)
            .put("/api/v1/schedule")
            .set("Cookie", cookieOf(CONFIGURER_ID))
            .send({
                slotMinutes: base.slotMinutes,
                seatsPerSlot: base.seatsPerSlot,
                windowDays: base.windowDays,
                minNoticeDays: base.minNoticeDays,
                waitAlertDays: base.waitAlertDays,
                unitAddress: base.unitAddress,
                unitAddressComplement: base.unitAddressComplement,
                reminderEnabled: base.reminderEnabled,
                reminderHours: base.reminderHours,
                ranges: base.ranges,
                blockedDates: [
                    {
                        date: "2027-11-03",
                        startTime: null,
                        endTime: null,
                        description: "Recesso",
                    },
                ],
            })

        expect(response.status).toBe(409)
        expect(response.body.error.code).toBe("SCHEDULE_CONFLICTS")
        expect(response.body.error.details.conflicts).toEqual([
            expect.objectContaining({
                id: "42",
                protocol: "ABCD1234",
                name: "Ana Beatriz",
                date: "2027-11-03",
                time: "08:00",
                code: "DATE_BLOCKED",
                reason: "Data bloqueada: Recesso",
            }),
        ])
    })

    it("responde 400 BAD_REQUEST em PUT /api/v1/schedule para duração inválida ou faixas sobrepostas", async () => {
        const base = buildDefaultScheduleConfigView()

        const badDuration = await request(app)
            .put("/api/v1/schedule")
            .set("Cookie", cookieOf(CONFIGURER_ID))
            .send({
                ...base,
                slotMinutes: 45,
            })
        expect(badDuration.status).toBe(400)

        const overlapping = await request(app)
            .put("/api/v1/schedule")
            .set("Cookie", cookieOf(CONFIGURER_ID))
            .send({
                ...base,
                ranges: [
                    { weekday: 1, startTime: "08:00", endTime: "12:00" },
                    { weekday: 1, startTime: "11:00", endTime: "15:00" },
                ],
            })
        expect(overlapping.status).toBe(400)
        expect(overlapping.body.error.message).toContain("sobrepõe")
    })

    it("responde 400 com o caminho e a mensagem da faixa inválida em error.details.issues", async () => {
        const base = buildDefaultScheduleConfigView()

        const response = await request(app)
            .put("/api/v1/schedule")
            .set("Cookie", cookieOf(CONFIGURER_ID))
            .send({
                ...base,
                ranges: [
                    { weekday: 1, startTime: "08:00", endTime: "12:00" },
                    { weekday: 2, startTime: "08:00", endTime: "12:00" },
                    { weekday: 3, startTime: "08:00", endTime: "08:20" },
                ],
            })

        expect(response.status).toBe(400)
        expect(response.body).toEqual({
            error: {
                code: "BAD_REQUEST",
                message: "Dados inválidos: ranges.2.endTime: Esta faixa não comporta nenhum atendimento de 30 minutos",
                details: {
                    issues: [
                        {
                            path: "ranges.2.endTime",
                            message: "Esta faixa não comporta nenhum atendimento de 30 minutos",
                        },
                    ],
                },
            },
        })
    })

    it("retorna prévia mensal em GET /api/v1/schedule/preview e POST /api/v1/schedule/preview (rascunho)", async () => {
        const getRes = await request(app)
            .get("/api/v1/schedule/preview?month=2026-10")
            .set("Cookie", cookieOf(CONFIGURER_ID))

        expect(getRes.status).toBe(200)
        expect(getRes.body.data.month).toBe("2026-10")
        expect(getRes.body.data.days).toHaveLength(31)
        expect(getRes.body.data.weekdays).toHaveLength(7)

        const base = buildDefaultScheduleConfigView()
        const postRes = await request(app)
            .post("/api/v1/schedule/preview")
            .set("Cookie", cookieOf(CONFIGURER_ID))
            .send({
                month: "2026-10",
                config: {
                    slotMinutes: 60,
                    seatsPerSlot: 1,
                    windowDays: base.windowDays,
                    minNoticeDays: base.minNoticeDays,
                    waitAlertDays: base.waitAlertDays,
                    unitAddress: base.unitAddress,
                    unitAddressComplement: base.unitAddressComplement,
                    reminderEnabled: base.reminderEnabled,
                    reminderHours: base.reminderHours,
                    ranges: [{ weekday: 1, startTime: "08:00", endTime: "12:00" }],
                    blockedDates: [],
                },
            })

        expect(postRes.status).toBe(200)
        const monday = postRes.body.data.weekdays.find(
            (w: { weekday: number }) => w.weekday === 1,
        )
        expect(monday).toEqual({
            weekday: 1,
            slots: ["08:00", "09:00", "10:00", "11:00"],
            totalSlots: 4,
            totalSeats: 4,
        })
    })
})
