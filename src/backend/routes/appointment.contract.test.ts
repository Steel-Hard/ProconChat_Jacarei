import express from "express"
import request from "supertest"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import errorHandler from "../middleware/errorHandler.middleware"
import { createRequireAuth } from "../middleware/auth.middleware"
import { createRequireTrustedOrigin } from "../middleware/trustedOrigin.middleware"
import {
    buildAppointmentDetail,
    buildChipCounts,
    buildListItem,
    conversationEventsOf,
    conversationTimelineEvents,
    FIXED_DATES,
    FIXED_NOW,
} from "../repositories/mock/appointment.builders"
import { AppointmentRepositoryStub } from "../repositories/mock/appointmentStub.repository"
import ConflictError from "../errors/ConflictError"
import { createAppointmentCalendarService } from "../services/appointmentCalendar.service"
import { buildDefaultScheduleConfigView } from "../repositories/mock/scheduleStub.repository"
import type { CorrectionWarning } from "../types/appointment.types"
import { parseLocalDate } from "../utils/date.utils"
import { MockAuthRepository } from "../repositories/mock/authMock.repository"
import { sessionTokens } from "../utils/sessionToken"
import { AppointmentRoutes } from "./appointment.routes"

const ORIGIN = "http://localhost:5173"

const LIST_ENVELOPE_KEYS = ["chipCounts", "items", "limit", "page", "total", "totalPages"]
const LIST_ITEM_KEYS = [
    "appointment_code",
    "appointment_datetime",
    "assigned_user_id",
    "assigned_user_name",
    "by_representative",
    "category_name",
    "cpf_masked",
    "id",
    "name",
    "off_grid",
    "protocol",
    "question_title",
    "status",
    "waiting_record",
]
const CHIP_KEYS = ["all", "attended", "canceled", "confirmed", "no_show", "pending", "waiting_record"]
const DETAIL_KEYS = [
    "appointment_code",
    "appointment_datetime",
    "assigned_user_id",
    "assigned_user_name",
    "available_actions",
    "by_representative",
    "category_id",
    "category_name",
    "cpf_masked",
    "documents_sent",
    "events",
    "id",
    "is_documents_config_different",
    "name",
    "notes",
    "off_grid",
    "protocol",
    "question_id",
    "question_title",
    "reason",
    "request_datetime",
    "rescheduled_from",
    "session_id",
    "status",
    "timeline",
]
const TIMELINE_STEP_KEYS = ["created_at", "data", "generated_by_ai", "id", "type"]
const EVENT_KEYS = ["actor_user_id", "actor_user_name", "created_at", "data", "id", "type"]
const ACTION_KEYS = ["add_note", "assign", "attended", "claim", "correct_record", "no_show"]
const AVAILABILITY_KEYS = ["allowed", "code"]
const ERROR_KEYS = ["code", "message"]
const PATCH_CONFLICT_CODES = [
    "APPOINTMENT_ALREADY_CLAIMED",
    "ALREADY_ATTENDED",
    "ALREADY_NO_SHOW",
    "APPOINTMENT_CANCELED",
    "ATTENDANCE_NOT_YET_AVAILABLE",
    "NO_SHOW_NOT_YET_AVAILABLE",
    "RECORD_NOT_CORRECTABLE",
    "ALREADY_ASSIGNED_TO_USER",
    "INVALID_ASSIGNEE",
    "ASSIGNEE_BUSY",
]
const AVAILABILITY_CODES = [...PATCH_CONFLICT_CODES, "PERMISSION_REQUIRED"]
const FORBIDDEN_FIELDS = ["cpf_hash", "phone_encrypted", "phone_hash"]
const NOTE_KEYS = ["author_user_id", "author_user_name", "created_at", "id", "text"]
const STAFF_KEYS = ["active", "id", "name"]
const CALENDAR_KEYS = ["appointments", "days", "weekEnd", "weekStart", "weekStartDay"]
const CALENDAR_DAY_KEYS = ["blocked", "date", "slots"]
const CALENDAR_SLOT_KEYS = ["freeSeats", "time"]
const CALENDAR_ITEM_KEYS = ["assigned_user_id", "date", "id", "off_grid", "protocol", "shortName", "status", "time"]
const WARNING_KEYS = ["code", "details", "message"]
const BUSY_DETAIL_KEYS = ["assigneeUserId", "conflictingAppointmentId", "conflictingProtocol"]
const WARNING_BASE_KEYS = ["appointmentId", "freeStaffCount", "previousAssignedUserId", "previousAssignedUserName", "protocol"]
const BUSY_DETAILS = { assigneeUserId: "2", conflictingAppointmentId: "33", conflictingProtocol: "B71C0D2E" }
const UNAVAILABLE_WARNING: CorrectionWarning = {
    code: "RESPONSIBLE_UNAVAILABLE",
    message: "O responsável anterior não pode mais ser responsável por agendamentos. O agendamento voltou para Pendente sem responsável.",
    details: {
        appointmentId: "4",
        protocol: "A1B2C3D4",
        previousAssignedUserId: "2",
        previousAssignedUserName: "Carlos Atendente",
        freeStaffCount: 1,
    },
}
const BUSY_WARNING: CorrectionWarning = {
    code: "RESPONSIBLE_BUSY",
    message: "O responsável anterior já tem outro agendamento neste horário. O agendamento voltou para Pendente sem responsável.",
    details: { ...UNAVAILABLE_WARNING.details, conflictingAppointmentId: "33", conflictingProtocol: "B71C0D2E", freeStaffCount: 0 },
}

const authUsers = new MockAuthRepository([
    {
        id: 1,
        email: "admin@exemplo.test",
        passwordHash: "x",
        name: "Admin",
        isAdmin: true,
        permissions: [],
        sessionVersion: 1,
    },
    {
        id: 5,
        email: "viewer@exemplo.test",
        passwordHash: "x",
        name: "Viewer",
        isAdmin: false,
        permissions: ["appointments.view"],
        sessionVersion: 1,
    },
])

function cookieFor(userId: number): string {
    return `proconchat_access=${sessionTokens.signAccessToken({ userId, sessionVersion: 1 })}`
}

function keysOf(value: object): string[] {
    return Object.keys(value).sort()
}

function expectErrorEnvelope(body: unknown, code: string): void {
    expect(keysOf(body as object)).toEqual(["error"])
    const error = (body as { error: { code: string; message: unknown } }).error
    expect(keysOf(error)).toEqual(ERROR_KEYS)
    expect(error.code).toBe(code)
    expect(typeof error.message).toBe("string")
}

function contractScenario(): AppointmentRepositoryStub {
    const carlos = { assigned_user_id: "2", assigned_user_name: "Carlos Atendente" }
    const note = {
        id: "1",
        author_user_id: "2",
        author_user_name: "Carlos Atendente",
        text: "Documento conferido.",
        created_at: FIXED_NOW.toISOString(),
    }
    return new AppointmentRepositoryStub({
        staff: [{ id: "2", name: "Carlos Atendente", active: true }],
        week: [
            {
                id: "1",
                protocol: "A1B2C3D4",
                shortName: "Maria",
                appointmentDatetime: parseLocalDate("2026-10-21", "08:30"),
                status: "PENDING",
                assigned_user_id: null,
                off_grid: false,
            },
        ],
        failAction: (call) => {
            if (call.action === "assign" && call.assigneeUserId === 99) {
                return new ConflictError("O funcionário já tem outro agendamento neste horário", "ASSIGNEE_BUSY", BUSY_DETAILS)
            }
            return null
        },
        correctionWarning: (call) => {
            if (call.id === "4") {
                return UNAVAILABLE_WARNING
            }
            return call.id === "5" ? BUSY_WARNING : null
        },
        details: [
            buildAppointmentDetail({ notes: [note] }),
            buildAppointmentDetail({ id: "2", status: "CONFIRMED", appointment_datetime: FIXED_DATES.afterTomorrow, ...carlos }),
            buildAppointmentDetail({ id: "4", status: "ATTENDED", appointment_datetime: FIXED_DATES.threeDaysAgo, ...carlos }),
            buildAppointmentDetail({ id: "5", status: "NO_SHOW", appointment_datetime: FIXED_DATES.fourDaysAgo, ...carlos }),
            buildAppointmentDetail({ id: "6", status: "CANCELED", appointment_datetime: FIXED_DATES.inThreeDays }),
            buildAppointmentDetail({ id: "7", status: "ATTENDED", appointment_datetime: FIXED_DATES.yesterday, ...carlos }),
        ],
        list: {
            items: [buildListItem(), buildListItem({ id: "2", status: "CONFIRMED", ...carlos })],
            total: 2,
            chipCounts: buildChipCounts({ all: 2, pending: 1, confirmed: 1 }),
        },
        pendingCount: 1,
        titles: {
            categories: { 10: "Cobrança" },
            questions: { 1: "Cobrança indevida de serviço não contratado" },
        },
        afterAction: (call, current) => ({
            ...current,
            status: call.action === "correct_record" ? "PENDING" : "CONFIRMED",
            assigned_user_id: String(call.actorUserId),
            assigned_user_name: "Admin",
            events: [
                {
                    id: "2",
                    type: "CLAIMED",
                    actor_user_id: String(call.actorUserId),
                    actor_user_name: "Admin",
                    data: {},
                    created_at: (call.now ?? FIXED_NOW).toISOString(),
                },
                ...current.events,
            ],
        }),
    })
}

describe("contrato da API de agendamentos", () => {
    let app: express.Express
    let repository: AppointmentRepositoryStub

    beforeEach(() => {
        vi.useFakeTimers({ toFake: ["Date"] })
        vi.setSystemTime(FIXED_NOW)
        repository = contractScenario()
        app = express()
        app.use(express.json())
        app.use("/api/v1", createRequireTrustedOrigin(ORIGIN))
        app.use(
            "/api/v1/appointments",
            new AppointmentRoutes({
                repository,
                conversationEvents: conversationEventsOf(conversationTimelineEvents("101")),
                authMiddleware: createRequireAuth({ users: authUsers, tokens: sessionTokens }),
                calendar: createAppointmentCalendarService({
                    schedule: { getAvailableSlots: async () => [] },
                    scheduleRepository: {
                        getScheduleVersions: async () => [{
                            effectiveFrom: null,
                            config: buildDefaultScheduleConfigView({
                                ranges: [1, 2, 3, 4, 5].map((weekday) => ({
                                    weekday,
                                    slotIndex: 1,
                                    startTime: "08:00",
                                    endTime: "10:00",
                                })),
                            }),
                        }],
                    },
                    appointments: repository,
                }),
            }).getRouter(),
        )
        app.use(errorHandler)
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    function get(path: string, userId = 1): request.Test {
        return request(app).get(`/api/v1/appointments${path}`).set("Cookie", cookieFor(userId))
    }

    function patch(id: number, action: string, userId = 1, extra: Record<string, unknown> = {}): request.Test {
        return request(app)
            .patch(`/api/v1/appointments/${id}/status`)
            .set("Origin", ORIGIN)
            .set("Cookie", cookieFor(userId))
            .send({ action, ...extra })
    }

    function expectBusyEnvelope(body: unknown): void {
        expect(keysOf(body as object)).toEqual(["error"])
        const error = (body as { error: { code: string; details: object } }).error
        expect(keysOf(error)).toEqual(["code", "details", "message"])
        expect(error.code).toBe("ASSIGNEE_BUSY")
        expect(keysOf(error.details)).toEqual(BUSY_DETAIL_KEYS)
    }

    describe("lista", () => {
        it("o envelope da lista e os chips têm exatamente as chaves documentadas", async () => {
            const res = await get("?period=all")

            expect(res.status).toBe(200)
            expect(keysOf(res.body)).toEqual(["data"])
            expect(keysOf(res.body.data)).toEqual(LIST_ENVELOPE_KEYS)
            expect(keysOf(res.body.data.chipCounts)).toEqual(CHIP_KEYS)
        })

        it("cada item da lista tem exatamente as chaves documentadas", async () => {
            const res = await get("?period=all")

            expect(res.body.data.items.length).toBeGreaterThan(0)
            for (const item of res.body.data.items) {
                expect(keysOf(item)).toEqual(LIST_ITEM_KEYS)
            }
        })
    })

    describe("contador de pendentes", () => {
        it("devolve só o campo count", async () => {
            const res = await get("/pending-count")

            expect(res.status).toBe(200)
            expect(res.body).toEqual({ data: { count: expect.any(Number) } })
        })
    })

    describe("detalhe", () => {
        it("o detalhe tem exatamente as chaves documentadas", async () => {
            const res = await get("/1")

            expect(res.status).toBe(200)
            expect(keysOf(res.body.data)).toEqual(DETAIL_KEYS)
            expect(keysOf(res.body.data.documents_sent)).toEqual(["group", "question"])
        })

        it("o passo da linha do tempo e o evento do histórico têm exatamente as chaves documentadas", async () => {
            const res = await get("/1")

            expect(res.body.data.timeline.length).toBeGreaterThan(0)
            for (const step of res.body.data.timeline) {
                expect(keysOf(step)).toEqual(TIMELINE_STEP_KEYS)
            }
            expect(res.body.data.events.length).toBeGreaterThan(0)
            for (const event of res.body.data.events) {
                expect(keysOf(event)).toEqual(EVENT_KEYS)
            }
        })

        it("available_actions traz as seis ações com allowed e code", async () => {
            const res = await get("/1")

            const actions = res.body.data.available_actions
            expect(keysOf(actions)).toEqual(ACTION_KEYS)
            for (const action of ACTION_KEYS) {
                expect(keysOf(actions[action])).toEqual(AVAILABILITY_KEYS)
                expect(typeof actions[action].allowed).toBe("boolean")
                if (actions[action].allowed) {
                    expect(actions[action].code).toBeNull()
                } else {
                    expect(PATCH_CONFLICT_CODES).toContain(actions[action].code)
                }
            }
        })

        it("para a conta só com appointments.view, available_actions usa só códigos documentados", async () => {
            const res = await get("/1", 5)

            const actions = res.body.data.available_actions
            expect(keysOf(actions)).toEqual(ACTION_KEYS)
            for (const action of ACTION_KEYS) {
                expect(keysOf(actions[action])).toEqual(AVAILABILITY_KEYS)
                expect(actions[action].allowed).toBe(false)
                expect(AVAILABILITY_CODES).toContain(actions[action].code)
            }
        })
    })

    describe("observações", () => {
        it("cada observação do detalhe tem exatamente as chaves documentadas", async () => {
            const res = await get("/1")

            expect(res.body.data.notes.length).toBeGreaterThan(0)
            for (const note of res.body.data.notes) {
                expect(keysOf(note)).toEqual(NOTE_KEYS)
            }
        })

        it("o POST de observação devolve 201 com o detalhe completo", async () => {
            const res = await request(app)
                .post("/api/v1/appointments/1/notes")
                .set("Origin", ORIGIN)
                .set("Cookie", cookieFor(1))
                .send({ text: "Nova observação" })

            expect(res.status).toBe(201)
            expect(keysOf(res.body)).toEqual(["data"])
            expect(keysOf(res.body.data)).toEqual(DETAIL_KEYS)
        })
    })

    describe("funcionários e calendário", () => {
        it("a lista de funcionários só tem id, name e active", async () => {
            const res = await get("/staff", 5)

            expect(res.status).toBe(200)
            expect(keysOf(res.body)).toEqual(["data"])
            for (const member of res.body.data) {
                expect(keysOf(member)).toEqual(STAFF_KEYS)
            }
        })

        it("o calendário tem exatamente as chaves documentadas, com weekStartDay", async () => {
            const res = await get("/calendar?date=2026-10-21", 5)

            expect(res.status).toBe(200)
            expect(keysOf(res.body.data)).toEqual(CALENDAR_KEYS)
            expect(res.body.data.weekStartDay).toBe(0)
            expect(res.body.data.days.length).toBeGreaterThan(0)
            for (const day of res.body.data.days) {
                expect(keysOf(day)).toEqual(CALENDAR_DAY_KEYS)
                expect(keysOf(day.blocked)).toEqual(["description", "fullDay", "periods"])
                for (const slot of day.slots) {
                    expect(keysOf(slot)).toEqual(CALENDAR_SLOT_KEYS)
                }
            }
            expect(res.body.data.appointments.length).toBeGreaterThan(0)
            for (const item of res.body.data.appointments) {
                expect(keysOf(item)).toEqual(CALENDAR_ITEM_KEYS)
            }
        })
    })

    describe("ações", () => {
        it("a resposta do PATCH é o mesmo detalhe que o GET devolve em seguida", async () => {
            const patchRes = await patch(1, "claim")
            const getRes = await get("/1")

            expect(patchRes.status).toBe(200)
            expect(keysOf(patchRes.body)).toEqual(["data"])
            expect(keysOf(patchRes.body.data)).toEqual(DETAIL_KEYS)
            expect(patchRes.body.data).toEqual(getRes.body.data)
        })

        it("as recusas do PATCH usam 409 e só os codes documentados", async () => {
            const cases: [number, string, string][] = [
                [2, "claim", "APPOINTMENT_ALREADY_CLAIMED"],
                [4, "claim", "ALREADY_ATTENDED"],
                [5, "claim", "ALREADY_NO_SHOW"],
                [6, "claim", "APPOINTMENT_CANCELED"],
                [4, "attended", "ALREADY_ATTENDED"],
                [5, "attended", "ALREADY_NO_SHOW"],
                [6, "attended", "APPOINTMENT_CANCELED"],
                [1, "attended", "ATTENDANCE_NOT_YET_AVAILABLE"],
                [4, "no_show", "ALREADY_ATTENDED"],
                [5, "no_show", "ALREADY_NO_SHOW"],
                [6, "no_show", "APPOINTMENT_CANCELED"],
                [1, "no_show", "NO_SHOW_NOT_YET_AVAILABLE"],
            ]

            for (const [id, action, code] of cases) {
                const res = await patch(id, action)

                expect(res.status).toBe(409)
                expectErrorEnvelope(res.body, code)
                expect(PATCH_CONFLICT_CODES).toContain(res.body.error.code)
            }
        })
    })

    describe("atribuir, corrigir e regra de horário", () => {
        it("o PATCH assign devolve o mesmo envelope de detalhe", async () => {
            const res = await patch(1, "assign", 1, { assigneeUserId: 2 })

            expect(res.status).toBe(200)
            expect(keysOf(res.body)).toEqual(["data"])
            expect(keysOf(res.body.data)).toEqual(DETAIL_KEYS)
        })

        it("o 409 ASSIGNEE_BUSY traz details com o protocolo conflitante", async () => {
            const res = await patch(1, "assign", 1, { assigneeUserId: 99 })

            expect(res.status).toBe(409)
            expectBusyEnvelope(res.body)
            expect(PATCH_CONFLICT_CODES).toContain(res.body.error.code)
        })

        it("a correção sem aviso responde só com data, sem a chave warning", async () => {
            const res = await patch(7, "correct_record")

            expect(res.status).toBe(200)
            expect(keysOf(res.body)).toEqual(["data"])
            expect(keysOf(res.body.data)).toEqual(DETAIL_KEYS)
        })

        it("a correção com RESPONSIBLE_UNAVAILABLE traz warning sem os campos do conflito", async () => {
            const res = await patch(4, "correct_record")

            expect(res.status).toBe(200)
            expect(keysOf(res.body)).toEqual(["data", "warning"])
            expect(keysOf(res.body.data)).toEqual(DETAIL_KEYS)
            expect(keysOf(res.body.warning)).toEqual(WARNING_KEYS)
            expect(res.body.warning.code).toBe("RESPONSIBLE_UNAVAILABLE")
            expect(keysOf(res.body.warning.details)).toEqual(WARNING_BASE_KEYS)
        })

        it("a correção com RESPONSIBLE_BUSY traz warning com os campos do conflito", async () => {
            const res = await patch(5, "correct_record")

            expect(keysOf(res.body)).toEqual(["data", "warning"])
            expect(res.body.warning.code).toBe("RESPONSIBLE_BUSY")
            expect(keysOf(res.body.warning.details)).toEqual(
                [...WARNING_BASE_KEYS, "conflictingAppointmentId", "conflictingProtocol"].sort(),
            )
        })
    })

    describe("erros", () => {
        it("400 usa o envelope de erro com BAD_REQUEST", async () => {
            const responses = [
                await get("?status=INEXISTENTE"),
                await get("/abc"),
                await patch(1, "invalido"),
            ]

            for (const res of responses) {
                expect(res.status).toBe(400)
                expectErrorEnvelope(res.body, "BAD_REQUEST")
            }
        })

        it("401 usa o envelope de erro com UNAUTHORIZED", async () => {
            const res = await request(app).get("/api/v1/appointments")

            expect(res.status).toBe(401)
            expectErrorEnvelope(res.body, "UNAUTHORIZED")
        })

        it("403 usa FORBIDDEN sem permissão e INVALID_ORIGIN sem origem confiável", async () => {
            const forbidden = await patch(1, "claim", 5)
            const invalidOrigin = await request(app)
                .patch("/api/v1/appointments/1/status")
                .set("Cookie", cookieFor(1))
                .send({ action: "claim" })

            expect(forbidden.status).toBe(403)
            expectErrorEnvelope(forbidden.body, "FORBIDDEN")
            expect(invalidOrigin.status).toBe(403)
            expectErrorEnvelope(invalidOrigin.body, "INVALID_ORIGIN")
        })

        it("404 usa o envelope de erro com NOT_FOUND no detalhe e na ação", async () => {
            const responses = [await get("/9999"), await patch(9999, "claim")]

            for (const res of responses) {
                expect(res.status).toBe(404)
                expectErrorEnvelope(res.body, "NOT_FOUND")
            }
        })
    })

    describe("dados pessoais", () => {
        it("nenhuma resposta traz cpf_hash, phone_encrypted nem phone_hash", async () => {
            const responses = [
                await get("?period=all"),
                await get("?search=111.444.777-35"),
                await get("/1"),
                await get("/pending-count"),
                await patch(1, "claim"),
            ]

            for (const res of responses) {
                const text = JSON.stringify(res.body)
                for (const field of FORBIDDEN_FIELDS) {
                    expect(text).not.toContain(`"${field}"`)
                }
            }
        })
    })
})
