import express, { NextFunction, Request, Response } from "express"
import request from "supertest"
import { describe, it, expect, vi, afterEach } from "vitest"
import errorHandler from "./errorHandler.middleware"
import BadRequestError from "../errors/BadRequestError"

function buildApp(throwError: () => unknown) {
    const app = express()
    app.get("/boom", (_req, _res, next) => next(throwError()))
    app.use(errorHandler)
    return app
}

describe("errorHandler", () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it("returns the AppError statusCode and code/message envelope", async () => {
        const app = buildApp(() => new BadRequestError("campo obrigatorio ausente"))

        const response = await request(app).get("/boom")

        expect(response.status).toBe(400)
        expect(response.body).toEqual({
            error: { code: "BAD_REQUEST", message: "campo obrigatorio ausente" },
        })
    })

    it("returns 500 with a generic envelope for unknown errors", async () => {
        vi.spyOn(console, "error").mockImplementation(() => undefined)
        const app = buildApp(() => new Error("falha inesperada"))

        const response = await request(app).get("/boom")

        expect(response.status).toBe(500)
        expect(response.body).toEqual({
            error: { code: "INTERNAL_SERVER_ERROR", message: "Internal Server Error" },
        })
    })

    it("delegates to next without touching the response when headers were already sent", () => {
        const res = { headersSent: true, status: vi.fn(), json: vi.fn() } as unknown as Response
        const next: NextFunction = vi.fn()
        const error = new Error("resposta ja enviada")

        errorHandler(error, {} as Request, res, next)

        expect(next).toHaveBeenCalledWith(error)
        expect(res.status).not.toHaveBeenCalled()
        expect(res.json).not.toHaveBeenCalled()
    })
})
