import express from "express"
import request from "supertest"
import { describe, it, expect, vi, afterEach } from "vitest"
import requestLoggerMiddleware from "./requestLogger.middleware"

function buildApp() {
    const app = express()
    app.use(requestLoggerMiddleware)
    app.get("/ping", (req, res) => res.status(200).json({ ok: true }))
    return app
}

describe("requestLoggerMiddleware", () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it("sets an x-request-id header and returns the response untouched", async () => {
        const app = buildApp()
        const response = await request(app).get("/ping")
        expect(response.status).toBe(200)
        expect(response.headers["x-request-id"]).toBeTruthy()
        expect(response.body).toEqual({ ok: true })
    })

    it("logs a single structured line once the response finishes", async () => {
        const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => undefined)
        const app = buildApp()
        const response = await request(app).get("/ping")
        await new Promise((resolve) => setTimeout(resolve, 10))
        expect(consoleLogSpy).toHaveBeenCalledTimes(1)
        const loggedPayload = JSON.parse(consoleLogSpy.mock.calls[0]?.[0] as string)
        expect(loggedPayload.method).toBe("GET")
        expect(loggedPayload.url).toBe("/ping")
        expect(loggedPayload.status).toBe(200)
        expect(loggedPayload.requestId).toBe(response.headers["x-request-id"])
        expect(typeof loggedPayload.durationMs).toBe("number")
    })
})
