import request from "supertest"
import { beforeEach, describe, expect, test, vi } from "vitest"
import app from "../app"
import { processEvolutionWebhook } from "../services/evolutionWebhook.service"

vi.mock("../services/evolutionWebhook.service", () => ({
    processEvolutionWebhook: vi.fn(),
}))

describe("POST /api/v1/webhooks/evolution", () => {
    beforeEach(() => vi.clearAllMocks())

    test("confirma o recebimento com 202", async () => {
        vi.mocked(processEvolutionWebhook).mockResolvedValue({
            status: "processed",
            sessionId: "42",
            newSession: true,
        })

        const response = await request(app)
            .post("/api/v1/webhooks/evolution?token=test-only-webhook-token")
            .send({ event: "messages.upsert", instance: "procon", data: {} })

        expect(response.status).toBe(202)
        expect(response.body).toEqual({
            data: { status: "processed", sessionId: "42", newSession: true },
        })
    })

    test("recusa webhook sem o token configurado", async () => {
        const response = await request(app)
            .post("/api/v1/webhooks/evolution")
            .send({ event: "messages.upsert" })

        expect(response.status).toBe(401)
        expect(response.body.error.code).toBe("UNAUTHORIZED")
        expect(processEvolutionWebhook).not.toHaveBeenCalled()
    })
})
