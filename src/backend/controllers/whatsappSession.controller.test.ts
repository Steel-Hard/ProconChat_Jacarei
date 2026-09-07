import request from "supertest"
import { beforeEach, describe, expect, test, vi } from "vitest"
import app from "../app"
import { resolveWhatsappSession } from "../services/whatsappSession.service"

vi.mock("../services/whatsappSession.service", () => ({
    resolveWhatsappSession: vi.fn(),
}))

describe("POST /api/v1/whatsapp/sessions", () => {
    beforeEach(() => vi.clearAllMocks())

    test("resolve a sessao com 202 quando o token interno e valido", async () => {
        vi.mocked(resolveWhatsappSession).mockResolvedValue({ sessionId: "42", newSession: true })

        const response = await request(app)
            .post("/api/v1/whatsapp/sessions")
            .set("X-Internal-Token", process.env.GATEWAY_INTERNAL_TOKEN as string)
            .send({ phone: "5511999999999" })

        expect(response.status).toBe(202)
        expect(response.body).toEqual({ data: { sessionId: "42", newSession: true } })
    })

    test("recusa a requisicao sem o token interno", async () => {
        const response = await request(app)
            .post("/api/v1/whatsapp/sessions")
            .send({ phone: "5511999999999" })

        expect(response.status).toBe(401)
        expect(response.body.error.code).toBe("UNAUTHORIZED")
        expect(resolveWhatsappSession).not.toHaveBeenCalled()
    })

    test("recusa a requisicao com o token interno errado", async () => {
        const response = await request(app)
            .post("/api/v1/whatsapp/sessions")
            .set("X-Internal-Token", "token-errado")
            .send({ phone: "5511999999999" })

        expect(response.status).toBe(401)
        expect(resolveWhatsappSession).not.toHaveBeenCalled()
    })
})
