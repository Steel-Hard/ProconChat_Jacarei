import request from "supertest"
import { describe, it, expect } from "vitest"
import app from "../app"

describe("GET /health", () => {
    it("retorna 200 com o envelope { data: { status: \"ok\" } }", async () => {
        const response = await request(app).get("/health")

        expect(response.status).toBe(200)
        expect(response.body).toEqual({ data: { status: "ok" } })
    })
})
