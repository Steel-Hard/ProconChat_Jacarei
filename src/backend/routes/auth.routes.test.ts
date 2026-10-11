import request from "supertest"
import { describe, expect, it } from "vitest"
import app from "../app"

describe("Protected authentication endpoints", () => {
    it.each([
        ["GET", "/api/v1/auth/me"],
        ["POST", "/api/v1/auth/logout"],
        ["POST", "/api/v1/auth/change-password"],
    ] as const)("returns 401 for %s %s without a session", async (method, path) => {
        const response = method === "GET"
            ? await request(app).get(path)
            : await request(app).post(path)

        expect(response.status).toBe(401)
        expect(response.body.error.code).toBe("UNAUTHORIZED")
    })
})
