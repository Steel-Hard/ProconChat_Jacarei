import { createHmac } from "node:crypto"
import { Request, Response } from "express"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { receiveWhatsappWebhook, verifyWhatsappWebhook } from "./whatsappWebhook.controller"
import { processWhatsappWebhook } from "../services/whatsappWebhook.service"

vi.mock("../services/whatsappWebhook.service", () => ({
    processWhatsappWebhook: vi.fn(),
}))

function buildResponse(): Response {
    const res = {} as Response
    res.status = vi.fn().mockReturnValue(res)
    res.json = vi.fn().mockReturnValue(res)
    res.type = vi.fn().mockReturnValue(res)
    res.send = vi.fn().mockReturnValue(res)
    return res
}

function requestWith(body: Buffer, signature?: string): Request {
    return {
        body,
        get: (name: string) => (name.toLowerCase() === "x-hub-signature-256" ? signature : undefined),
    } as unknown as Request
}

describe("whatsappWebhook controller", () => {
    beforeEach(() => vi.clearAllMocks())

    test("devolve o hub.challenge em text/plain quando a verificacao confere", () => {
        const req = {
            query: {
                "hub.mode": "subscribe",
                "hub.verify_token": "test-only-verify-token",
                "hub.challenge": "abc",
            },
        } as unknown as Request
        const res = buildResponse()
        const next = vi.fn()

        verifyWhatsappWebhook(req, res, next)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.type).toHaveBeenCalledWith("text/plain")
        expect(res.send).toHaveBeenCalledWith("abc")
        expect(next).not.toHaveBeenCalled()
    })

    test("delega ao next com 401 e nao chama o service quando a assinatura nao confere", async () => {
        const res = buildResponse()
        const next = vi.fn()

        await receiveWhatsappWebhook(requestWith(Buffer.from("{}"), "sha256=00"), res, next)

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401, code: "UNAUTHORIZED" }))
        expect(processWhatsappWebhook).not.toHaveBeenCalled()
    })

    test("responde 200 com o resultado do service quando a assinatura confere", async () => {
        vi.mocked(processWhatsappWebhook).mockResolvedValue({ results: [] })
        const body = Buffer.from(JSON.stringify({ object: "whatsapp_business_account", entry: [] }))
        const signature = `sha256=${createHmac("sha256", "test-only-app-secret").update(body).digest("hex")}`
        const res = buildResponse()
        const next = vi.fn()

        await receiveWhatsappWebhook(requestWith(body, signature), res, next)

        expect(processWhatsappWebhook).toHaveBeenCalledWith({ object: "whatsapp_business_account", entry: [] })
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith({ data: { results: [] } })
        expect(next).not.toHaveBeenCalled()
    })
})
