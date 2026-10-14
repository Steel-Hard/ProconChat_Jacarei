import request from "supertest"
import { beforeEach, describe, expect, test, vi } from "vitest"
import app from "../app"
import { processIncomingMessage } from "../services/conversationFlow.service"

vi.mock("../services/conversationFlow.service", () => ({
    processIncomingMessage: vi.fn(),
}))

describe("POST /api/v1/whatsapp/sessions", () => {
    beforeEach(() => vi.clearAllMocks())

    test("resolve a sessao com 202 quando o token interno e valido", async () => {
        vi.mocked(processIncomingMessage).mockResolvedValue({
            sessionId: "42",
            newSession: true,
            reply: { text: "1. Categoria A", step: "AWAITING_CATEGORY" },
        })

        const response = await request(app)
            .post("/api/v1/whatsapp/sessions")
            .set("X-Internal-Token", process.env.GATEWAY_INTERNAL_TOKEN as string)
            .send({ phone: "5511999999999" })

        expect(response.status).toBe(202)
        expect(response.body).toEqual({
            data: {
                sessionId: "42",
                newSession: true,
                reply: { text: "1. Categoria A", step: "AWAITING_CATEGORY" },
            },
        })
    })

    test("recusa a requisicao sem o token interno", async () => {
        const response = await request(app)
            .post("/api/v1/whatsapp/sessions")
            .send({ phone: "5511999999999" })

        expect(response.status).toBe(401)
        expect(response.body.error.code).toBe("UNAUTHORIZED")
        expect(processIncomingMessage).not.toHaveBeenCalled()
    })

    test("recusa a requisicao com o token interno errado", async () => {
        const response = await request(app)
            .post("/api/v1/whatsapp/sessions")
            .set("X-Internal-Token", "token-errado")
            .send({ phone: "5511999999999" })

        expect(response.status).toBe(401)
        expect(processIncomingMessage).not.toHaveBeenCalled()
    })
})
