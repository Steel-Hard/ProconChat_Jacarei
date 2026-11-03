import request from "supertest"
import { beforeEach, describe, expect, test, vi } from "vitest"
import app from "../app"
import { recordWhatsAppEvents } from "../services/whatsappEvents.service"

vi.mock("../services/whatsappEvents.service", () => ({
    recordWhatsAppEvents: vi.fn(),
}))

const PATH = "/api/v1/internal/whatsapp/events"

describe("POST /api/v1/internal/whatsapp/events", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(recordWhatsAppEvents).mockResolvedValue(undefined)
    })

    test("recusa a requisicao sem o token interno sem gravar nada", async () => {
        const response = await request(app).post(PATH).send({ statuses: [] })

        expect(response.status).toBe(401)
        expect(response.body).toEqual({ error: { code: "UNAUTHORIZED", message: "Invalid gateway internal token" } })
        expect(recordWhatsAppEvents).not.toHaveBeenCalled()
    })

    test("recusa a requisicao com o token interno errado sem gravar nada", async () => {
        const response = await request(app).post(PATH).set("X-Internal-Token", "token-errado").send({ statuses: [] })

        expect(response.status).toBe(401)
        expect(response.body).toEqual({ error: { code: "UNAUTHORIZED", message: "Invalid gateway internal token" } })
        expect(recordWhatsAppEvents).not.toHaveBeenCalled()
    })

    test("responde 204 sem corpo com o token valido, sem Origin, e repassa o corpo ao service", async () => {
        const response = await request(app)
            .post(PATH)
            .set("X-Internal-Token", process.env.GATEWAY_INTERNAL_TOKEN as string)
            .send({ statuses: [] })

        expect(response.status).toBe(204)
        expect(response.text).toBe("")
        expect(recordWhatsAppEvents).toHaveBeenCalledWith({ statuses: [] })
    })
})
