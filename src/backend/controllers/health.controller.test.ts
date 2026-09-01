import { Request, Response } from "express"
import { describe, it, expect, vi } from "vitest"
import HealthController from "./health.controller"
import HealthService from "../services/health.service"

vi.mock("../services/health.service")

function buildResponse(): Response {
    const res = {} as Response
    res.status = vi.fn().mockReturnValue(res)
    res.json = vi.fn().mockReturnValue(res)
    return res
}

describe("HealthController", () => {
    it("responds 200 with the { data } envelope on success", () => {
        vi.mocked(HealthService.prototype.check).mockReturnValue({ status: "ok" })
        const controller = new HealthController()
        const res = buildResponse()
        const next = vi.fn()

        controller.check({} as Request, res, next)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith({ data: { status: "ok" } })
        expect(next).not.toHaveBeenCalled()
    })

    it("delegates to next when the service throws", () => {
        vi.mocked(HealthService.prototype.check).mockImplementation(() => {
            throw new Error("falha inesperada")
        })
        const controller = new HealthController()
        const res = buildResponse()
        const next = vi.fn()

        controller.check({} as Request, res, next)

        expect(next).toHaveBeenCalledWith(expect.any(Error))
        expect(res.status).not.toHaveBeenCalled()
    })
})
