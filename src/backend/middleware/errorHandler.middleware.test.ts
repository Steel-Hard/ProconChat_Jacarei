import express, { NextFunction, Request, Response } from "express"
import request from "supertest"
import { describe, it, expect, vi, afterEach } from "vitest"
import errorHandler from "./errorHandler.middleware"
import BadRequestError from "../errors/BadRequestError"
import ConflictError from "../errors/ConflictError"
import ForbiddenError from "../errors/ForbiddenError"

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

    it("nao inclui a chave details quando o erro nao tem details", async () => {
        const app = buildApp(() => new ForbiddenError("Insufficient permission"))

        const response = await request(app).get("/boom")

        expect(response.status).toBe(403)
        expect(response.body).toEqual({ error: { code: "FORBIDDEN", message: "Insufficient permission" } })
        expect(response.body.error).not.toHaveProperty("details")
    })

    it("inclui o details no envelope quando o erro tem details", async () => {
        const app = buildApp(() => new ConflictError("destino ocupado", "REASSIGNMENT_TARGET_BUSY", {
            userId: 9,
            toUserId: 7,
            protocol: "AB12CD34",
            conflictingProtocol: "EF56GH78",
        }))

        const response = await request(app).get("/boom")

        expect(response.status).toBe(409)
        expect(response.body).toEqual({
            error: {
                code: "REASSIGNMENT_TARGET_BUSY",
                message: "destino ocupado",
                details: { userId: 9, toUserId: 7, protocol: "AB12CD34", conflictingProtocol: "EF56GH78" },
            },
        })
    })

    it("responde 400 BAD_REQUEST quando o corpo JSON esta malformado", async () => {
        const app = express()
        app.use(express.json())
        app.post("/json", (_req, res) => {
            res.status(200).end()
        })
        app.use(errorHandler)

        const response = await request(app).post("/json").set("Content-Type", "application/json").send("{quebrado")

        expect(response.status).toBe(400)
        expect(response.body).toEqual({ error: { code: "BAD_REQUEST", message: "Malformed JSON body" } })
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
