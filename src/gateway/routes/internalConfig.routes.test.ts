import request from "supertest"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import app from "../app"
import { backendClient } from "../clients/backend.client"
import { processWhatsappWebhook } from "../services/whatsappWebhook.service"

vi.mock("../services/whatsappWebhook.service", () => ({
    processWhatsappWebhook: vi.fn(async () => ({ results: [] })),
}))

vi.mock("../clients/backend.client", () => ({
    backendClient: { createWhatsappSession: vi.fn(), getWhatsappConfig: vi.fn(), reportWebhookEvents: vi.fn() },
}))

const PATH = "/internal/whatsapp/config/reload"
const config = {
    phoneNumberId: "100000000000001",
    accessToken: "token-do-banco",
    appSecret: "segredo-do-banco",
    verifyToken: "verify-token-do-banco",
    graphApiVersion: "v26.0",
}

function verification() {
    return request(app)
        .get("/webhooks/whatsapp")
        .query({ "hub.mode": "subscribe", "hub.verify_token": config.verifyToken, "hub.challenge": "123" })
}

describe("POST /internal/whatsapp/config/reload", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.spyOn(console, "log").mockImplementation(() => undefined)
        vi.mocked(backendClient.getWhatsappConfig).mockResolvedValue(config)
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test("recusa a requisicao sem o token interno", async () => {
        const response = await request(app).post(PATH)

        expect(response.status).toBe(401)
        expect(response.body).toEqual({ error: { code: "UNAUTHORIZED", message: "Invalid internal token" } })
    })

    test("recusa a requisicao com o token interno errado", async () => {
        const response = await request(app).post(PATH).set("X-Internal-Token", "token-errado")

        expect(response.status).toBe(401)
        expect(response.body.error.code).toBe("UNAUTHORIZED")
    })

    test("responde 204 sem corpo e a proxima requisicao busca a configuracao de novo", async () => {
        const first = await verification()
        const cached = await verification()
        const callsBeforeReload = vi.mocked(backendClient.getWhatsappConfig).mock.calls.length

        const response = await request(app).post(PATH).set("X-Internal-Token", process.env.GATEWAY_INTERNAL_TOKEN as string)
        const afterReload = await verification()

        expect(first.status).toBe(200)
        expect(cached.status).toBe(200)
        expect(callsBeforeReload).toBe(1)
        expect(response.status).toBe(204)
        expect(response.text).toBe("")
        expect(afterReload.status).toBe(200)
        expect(backendClient.getWhatsappConfig).toHaveBeenCalledTimes(2)
        expect(processWhatsappWebhook).not.toHaveBeenCalled()
    })
})
