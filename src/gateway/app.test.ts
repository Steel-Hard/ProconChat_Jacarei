import request from "supertest"
import { describe, it, expect } from "vitest"
import app from "./app"

describe("rotas removidas", () => {
    it("responde 404 para a rota antiga da Evolution", async () => {
        const response = await request(app)
            .post("/webhooks/evolution")
            .send({ event: "messages.upsert" })

        expect(response.status).toBe(404)
        expect(response.body).toEqual({
            error: { code: "NOT_FOUND", message: "Route not found" },
        })
    })
})
