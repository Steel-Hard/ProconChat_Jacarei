import { Request, Response } from "express"
import { beforeEach, describe, expect, it, vi } from "vitest"
import UnauthorizedError from "../errors/UnauthorizedError"
import {
    buildDefaultScheduleConfigView,
    createScheduleStubRepository,
} from "../repositories/mock/scheduleStub.repository"
import { createScheduleService, IScheduleService } from "../services/schedule.service"
import { AuthenticatedUser } from "../types/auth.types"
import ScheduleController from "./schedule.controller"

describe("schedule.controller", () => {
    let controller: ScheduleController
    let service: IScheduleService

    const mockUser: AuthenticatedUser = {
        id: 2,
        name: "Patrícia Lima",
        email: "patricia@exemplo.test",
        isAdmin: false,
        permissions: ["schedule.configure"],
        sessionVersion: 0,
    }

    beforeEach(() => {
        const repository = createScheduleStubRepository()
        service = createScheduleService(repository)
        controller = new ScheduleController({ service })
    })

    function mockResponse(): Response {
        const res: Partial<Response> = {}
        res.status = vi.fn().mockReturnValue(res)
        res.json = vi.fn().mockReturnValue(res)
        return res as Response
    }

    it("getConfig retorna 200 com envelope { data }", async () => {
        const req = { authUser: mockUser } as unknown as Request
        const res = mockResponse()
        const next = vi.fn()

        await controller.getConfig(req, res, next)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ slotMinutes: 30 }),
            }),
        )
        expect(next).not.toHaveBeenCalled()
    })

    it("saveConfig propaga UnauthorizedError para next quando req.authUser não existe", async () => {
        const req = {
            body: buildDefaultScheduleConfigView(),
        } as unknown as Request
        const res = mockResponse()
        const next = vi.fn()

        await controller.saveConfig(req, res, next)

        expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError))
    })

    it("getPreview e postPreview retornam 200 com prévia mensal", async () => {
        const reqGet = {
            query: { month: "2026-10" },
            authUser: mockUser,
        } as unknown as Request
        const resGet = mockResponse()
        const nextGet = vi.fn()

        await controller.getPreview(reqGet, resGet, nextGet)

        expect(resGet.status).toHaveBeenCalledWith(200)
        expect(resGet.json).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ month: "2026-10" }),
            }),
        )

        const reqPost = {
            body: {
                month: "2026-10",
                config: buildDefaultScheduleConfigView(),
            },
            authUser: mockUser,
        } as unknown as Request
        const resPost = mockResponse()
        const nextPost = vi.fn()

        await controller.postPreview(reqPost, resPost, nextPost)

        expect(resPost.status).toHaveBeenCalledWith(200)
        expect(resPost.json).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ month: "2026-10" }),
            }),
        )
    })
})
