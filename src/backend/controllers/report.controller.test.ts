import type { NextFunction, Request, Response } from "express"
import { describe, expect, it, vi } from "vitest"
import { createReportStubRepository } from "../repositories/mock/reportStub.repository"
import { createReportService } from "../services/report.service"
import ReportController from "./report.controller"

function createMockRes(): Response & {
    statusCode?: number
    jsonBody?: unknown
} {
    const res: Partial<Response> & { statusCode?: number; jsonBody?: unknown } =
        {}
    res.status = vi.fn((code: number) => {
        res.statusCode = code
        return res as Response
    })
    res.json = vi.fn((body: unknown) => {
        res.jsonBody = body
        return res as Response
    })
    return res as Response & { statusCode?: number; jsonBody?: unknown }
}

describe("report.controller", () => {
    it("repassa os parâmetros de query para o serviço e responde 200", async () => {
        const service = createReportService(createReportStubRepository())
        const spy = vi.spyOn(service, "getSummary")
        const controller = new ReportController({ service })
        const req = {
            query: {
                period: "custom",
                startDate: "2026-10-01",
                endDate: "2026-10-05",
            },
        } as unknown as Request
        const res = createMockRes()
        const next = vi.fn() as unknown as NextFunction

        await controller.getSummary(req, res, next)

        expect(spy).toHaveBeenCalledWith({
            period: "custom",
            startDate: "2026-10-01",
            endDate: "2026-10-05",
        })
        expect(res.statusCode).toBe(200)
        expect(next).not.toHaveBeenCalled()
    })

    it("encaminha erros do serviço para next(error)", async () => {
        const boom = new Error("Database failure")
        const controller = new ReportController({
            service: {
                getSummary: vi.fn().mockRejectedValue(boom),
            },
        })
        const req = { query: {} } as unknown as Request
        const res = createMockRes()
        const next = vi.fn() as unknown as NextFunction

        await controller.getSummary(req, res, next)

        expect(next).toHaveBeenCalledWith(boom)
    })
})
