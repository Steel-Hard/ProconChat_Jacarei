import { createHmac } from "node:crypto"
import request from "supertest"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import app from "../app"
import { processWhatsappWebhook } from "../services/whatsappWebhook.service"

vi.mock("../services/whatsappWebhook.service", () => ({
    processWhatsappWebhook: vi.fn(),
}))

const VERIFY_TOKEN = "test-only-verify-token"
const APP_SECRET = "test-only-app-secret"

const payload = {
    object: "whatsapp_business_account",
    entry: [
        {
            id: "200000000000001",
            changes: [
                {
                    field: "messages",
                    value: {
                        metadata: { phone_number_id: "100000000000001" },
                        messages: [{ id: "wamid.1", from: "5500000000001", type: "text", text: { body: "oi" } }],
                    },
                },
            ],
        },
    ],
}

function sign(body: string): string {
    return `sha256=${createHmac("sha256", APP_SECRET).update(body).digest("hex")}`
}

describe("GET /webhooks/whatsapp", () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    test("responde 200 em text/plain com o desafio quando o token confere", async () => {
        const response = await request(app)
            .get("/webhooks/whatsapp")
            .query({ "hub.mode": "subscribe", "hub.verify_token": VERIFY_TOKEN, "hub.challenge": "123" })

        expect(response.status).toBe(200)
        expect(response.headers["content-type"]).toMatch(/^text\/plain/)
        expect(response.text).toBe("123")
    })

    test("responde 403 FORBIDDEN sem ecoar o desafio quando o token e diferente", async () => {
        const response = await request(app)
            .get("/webhooks/whatsapp")
            .query({ "hub.mode": "subscribe", "hub.verify_token": "errado", "hub.challenge": "desafio-987" })

        expect(response.status).toBe(403)
        expect(response.body).toEqual({ error: { code: "FORBIDDEN", message: expect.any(String) } })
        expect(response.text).not.toContain("desafio-987")
    })

    test.each([
        { "hub.mode": "unsubscribe", "hub.verify_token": VERIFY_TOKEN, "hub.challenge": "123" },
        { "hub.verify_token": VERIFY_TOKEN, "hub.challenge": "123" },
        { "hub.mode": "subscribe", "hub.challenge": "123" },
        { "hub.mode": "subscribe", "hub.verify_token": VERIFY_TOKEN },
    ])("responde 403 quando hub.mode e outro ou falta parametro (%o)", async (query) => {
        const response = await request(app).get("/webhooks/whatsapp").query(query)

        expect(response.status).toBe(403)
        expect(response.body.error.code).toBe("FORBIDDEN")
    })

    test("nao registra o hub.verify_token no log de requisicao", async () => {
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined)

        await request(app)
            .get("/webhooks/whatsapp")
            .query({ "hub.mode": "subscribe", "hub.verify_token": VERIFY_TOKEN, "hub.challenge": "123" })

        const output = logSpy.mock.calls.map((call) => call.join(" ")).join("\n")
        expect(output).toContain("/webhooks/whatsapp")
        expect(output).not.toContain(VERIFY_TOKEN)
    })
})

describe("POST /webhooks/whatsapp", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.spyOn(console, "log").mockImplementation(() => undefined)
        vi.spyOn(console, "error").mockImplementation(() => undefined)
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test("processa o evento assinado com o App Secret e responde 200 com { data }", async () => {
        vi.mocked(processWhatsappWebhook).mockResolvedValue({
            results: [{ status: "processed", messageId: "wamid.1" }],
        })
        const body = JSON.stringify(payload)

        const response = await request(app)
            .post("/webhooks/whatsapp")
            .set("Content-Type", "application/json")
            .set("X-Hub-Signature-256", sign(body))
            .send(body)

        expect(response.status).toBe(200)
        expect(response.body).toEqual({ data: { results: [{ status: "processed", messageId: "wamid.1" }] } })
        expect(processWhatsappWebhook).toHaveBeenCalledWith(payload)
    })

    test("responde 401 sem chamar o service quando falta a assinatura", async () => {
        const response = await request(app)
            .post("/webhooks/whatsapp")
            .set("Content-Type", "application/json")
            .send(JSON.stringify(payload))

        expect(response.status).toBe(401)
        expect(response.body.error.code).toBe("UNAUTHORIZED")
        expect(processWhatsappWebhook).not.toHaveBeenCalled()
    })

    test("recusa o mesmo JSON reformatado, o que prova o uso do corpo cru", async () => {
        const signedBody = JSON.stringify(payload)
        const reformatted = JSON.stringify(payload, null, 2)

        const response = await request(app)
            .post("/webhooks/whatsapp")
            .set("Content-Type", "application/json")
            .set("X-Hub-Signature-256", sign(signedBody))
            .send(reformatted)

        expect(response.status).toBe(401)
        expect(processWhatsappWebhook).not.toHaveBeenCalled()
    })

    test("responde 400 BAD_REQUEST quando o corpo assinado nao e JSON valido", async () => {
        const body = "{ nao e json"

        const response = await request(app)
            .post("/webhooks/whatsapp")
            .set("Content-Type", "application/json")
            .set("X-Hub-Signature-256", sign(body))
            .send(body)

        expect(response.status).toBe(400)
        expect(response.body.error.code).toBe("BAD_REQUEST")
        expect(processWhatsappWebhook).not.toHaveBeenCalled()
    })

    test("responde 500 pelo errorHandler quando o service rejeita", async () => {
        vi.mocked(processWhatsappWebhook).mockRejectedValue(new Error("Backend returned HTTP 500"))
        const body = JSON.stringify(payload)

        const response = await request(app)
            .post("/webhooks/whatsapp")
            .set("Content-Type", "application/json")
            .set("X-Hub-Signature-256", sign(body))
            .send(body)

        expect(response.status).toBe(500)
        expect(response.body).toEqual({
            error: { code: "INTERNAL_SERVER_ERROR", message: "Internal Server Error" },
        })
    })

    test("responde 413 sem processar quando o corpo passa do limite", async () => {
        const body = JSON.stringify({ ...payload, filler: "x".repeat(200 * 1024) })

        const response = await request(app)
            .post("/webhooks/whatsapp")
            .set("Content-Type", "application/json")
            .set("X-Hub-Signature-256", sign(body))
            .send(body)

        expect(response.status).toBe(413)
        expect(response.body.error.code).toBe("PAYLOAD_TOO_LARGE")
        expect(processWhatsappWebhook).not.toHaveBeenCalled()
    })
})
