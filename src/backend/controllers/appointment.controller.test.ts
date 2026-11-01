import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Request, Response } from "express"
import AppointmentController from "./appointment.controller"
import { AppointmentService, createAppointmentService } from "../services/appointment.service"
import { buildAppointmentDetail, buildChipCounts, buildListItem, FIXED_NOW } from "../repositories/mock/appointment.builders"
import { AppointmentRepositoryStub } from "../repositories/mock/appointmentStub.repository"
import { AuthenticatedUser } from "../types/auth.types"
import { listAppointmentsQuerySchema } from "../schemas/appointment.schema"

describe("appointment.controller", () => {
    let controller: AppointmentController
    let service: AppointmentService
    let repository: AppointmentRepositoryStub

    const mockAdminUser: AuthenticatedUser = {
        id: 1,
        name: "Admin",
        email: "admin@exemplo.test",
        isAdmin: true,
        permissions: ["appointments.view", "appointments.manage"],
        sessionVersion: 0,
    }

    const mockStaffUser: AuthenticatedUser = {
        id: 10,
        name: "Staff",
        email: "staff@exemplo.test",
        isAdmin: false,
        permissions: ["appointments.manage"],
        sessionVersion: 0,
    }

    const calendarResult = { weekStart: "2026-10-18", weekEnd: "2026-10-24", weekStartDay: 0, days: [], appointments: [] }
    const calendar = { getCalendar: vi.fn().mockResolvedValue(calendarResult) }

    const mockConversationEvents = {
        record: vi.fn(),
        finish: vi.fn(),
        listBySession: vi.fn().mockResolvedValue([]),
    }

    beforeEach(() => {
        vi.useFakeTimers({ toFake: ["Date"] })
        vi.setSystemTime(FIXED_NOW)
        repository = new AppointmentRepositoryStub({
            details: [buildAppointmentDetail()],
            list: { items: [buildListItem()], total: 1, chipCounts: buildChipCounts({ all: 1, pending: 1 }) },
            pendingCount: 1,
            afterAction: (call, current) => ({
                ...current,
                status: "CONFIRMED",
                assigned_user_id: String(call.actorUserId),
            }),
        })
        service = createAppointmentService({ repository, conversationEvents: mockConversationEvents })
        controller = new AppointmentController({ service, calendar })
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    function mockResponse(): Response {
        const res: Partial<Response> = {}
        res.status = vi.fn().mockReturnValue(res)
        res.json = vi.fn().mockReturnValue(res)
        return res as Response
    }

    it("listAppointments chama o serviço e devolve 200 com envelope { data }", async () => {
        const req = {
            query: listAppointmentsQuerySchema.parse({ page: "1", limit: "10" }),
            authUser: mockAdminUser,
        } as unknown as Request
        const res = mockResponse()
        const next = vi.fn()

        await controller.listAppointments(req, res, next)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    items: expect.any(Array),
                    page: 1,
                    limit: 10,
                }),
            }),
        )
        expect(next).not.toHaveBeenCalled()
    })

    it("getPendingCount devolve 200 com envelope { data: { count } }", async () => {
        const req = { authUser: mockAdminUser } as unknown as Request
        const res = mockResponse()
        const next = vi.fn()

        await controller.getPendingCount(req, res, next)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ count: expect.any(Number) }),
            }),
        )
    })

    it("getAppointmentDetail devolve 200 com envelope { data: detail }", async () => {
        const req = { params: { id: "1" }, authUser: mockAdminUser } as unknown as Request
        const res = mockResponse()
        const next = vi.fn()

        await controller.getAppointmentDetail(req, res, next)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ id: "1", name: "Maria Silva" }),
            }),
        )
    })

    it("updateAppointmentStatus com action 'claim' devolve 200", async () => {
        const req = {
            params: { id: "1" },
            body: { action: "claim" },
            authUser: mockStaffUser,
        } as unknown as Request
        const res = mockResponse()
        const next = vi.fn()

        await controller.updateAppointmentStatus(req, res, next)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    status: "CONFIRMED",
                    assigned_user_id: "10",
                }),
            }),
        )
        expect(repository.actionCalls).toEqual([{ action: "claim", id: "1", actorUserId: 10, now: FIXED_NOW }])
    })

    it("updateAppointmentStatus com uma ação sem ramo recusa com 400 BAD_REQUEST e não corrige o registro", async () => {
        const req = {
            params: { id: "1" },
            body: { action: "acao_nova" },
            authUser: mockStaffUser,
        } as unknown as Request
        const res = mockResponse()
        const next = vi.fn()

        await controller.updateAppointmentStatus(req, res, next)

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400, code: "BAD_REQUEST", message: "Ação inválida" }))
        expect(res.status).not.toHaveBeenCalled()
        expect(repository.actionCalls).toEqual([])
    })

    it("propaga erro para o middleware next se o serviço lançar", async () => {
        const req = { params: { id: "9999" }, authUser: mockAdminUser } as unknown as Request
        const res = mockResponse()
        const next = vi.fn()

        await controller.getAppointmentDetail(req, res, next)

        expect(next).toHaveBeenCalledWith(expect.any(Error))
    })

    it("getCalendar repassa a query e a conta logada e devolve 200 com o calendário", async () => {
        const req = {
            query: { date: "2026-10-21", status: "all", responsible: "me" },
            authUser: mockStaffUser,
        } as unknown as Request
        const res = mockResponse()
        const next = vi.fn()

        await controller.getCalendar(req, res, next)

        expect(calendar.getCalendar).toHaveBeenCalledWith({
            date: "2026-10-21",
            status: "all",
            responsible: "me",
            currentUserId: 10,
        })
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith({ data: calendarResult })
    })
})
