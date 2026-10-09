import { createHmac, timingSafeEqual } from "node:crypto"
import { Request, Response } from "express"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { handleRawBodyError, receiveWhatsappWebhook, verifyWhatsappWebhook } from "./whatsappWebhook.controller"
import { processWhatsappWebhook } from "../services/whatsappWebhook.service"

vi.mock("../services/whatsappWebhook.service", () => ({
    processWhatsappWebhook: vi.fn(),
}))

vi.mock("node:crypto", async (importOriginal) => {
    const actual = await importOriginal<typeof import("node:crypto")>()
    return { ...actual, timingSafeEqual: vi.fn(actual.timingSafeEqual) }
})

function verificationRequest(token: string): Request {
    return {
        query: { "hub.mode": "subscribe", "hub.verify_token": token, "hub.challenge": "abc" },
    } as unknown as Request
}

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

    test("compara o verify token em tempo constante", () => {
        const res = buildResponse()
        const next = vi.fn()

        verifyWhatsappWebhook(verificationRequest("test-only-verify-token"), res, next)

        expect(timingSafeEqual).toHaveBeenCalledWith(
            Buffer.from("test-only-verify-token"),
            Buffer.from("test-only-verify-token"),
        )
        expect(res.send).toHaveBeenCalledWith("abc")
    })

    test("recusa com 403 o verify token de mesmo tamanho e conteudo diferente", () => {
        const res = buildResponse()
        const next = vi.fn()

        verifyWhatsappWebhook(verificationRequest("test-only-verify-tokeX"), res, next)

        expect(timingSafeEqual).toHaveBeenCalled()
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403, code: "FORBIDDEN" }))
        expect(res.send).not.toHaveBeenCalled()
    })

    test("recusa com 403 o verify token de outro tamanho sem chamar timingSafeEqual", () => {
        const res = buildResponse()
        const next = vi.fn()

        expect(() => verifyWhatsappWebhook(verificationRequest("curto"), res, next)).not.toThrow()

        expect(timingSafeEqual).not.toHaveBeenCalled()
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403, code: "FORBIDDEN" }))
    })
})

describe("handleRawBodyError", () => {
    function bodyParserError(status: number, type: string): Error {
        return Object.assign(new Error(type), { status, statusCode: status, type, expose: true })
    }

    function handled(error: unknown): unknown {
        const next = vi.fn()
        handleRawBodyError(error, {} as Request, buildResponse(), next)
        return next.mock.calls[0]?.[0]
    }

    test("mantem o 413 como PAYLOAD_TOO_LARGE", () => {
        const result = handled(bodyParserError(413, "entity.too.large"))

        expect(result).toMatchObject({ statusCode: 413, code: "PAYLOAD_TOO_LARGE" })
    })

    test.each([
        [400, "request.aborted"],
        [415, "encoding.unsupported"],
        [400, "request.size.invalid"],
        [415, "charset.unsupported"],
    ])("converte o erro %i %s do corpo cru em 400 BAD_REQUEST", (status, type) => {
        const result = handled(bodyParserError(status, type))

        expect(result).toMatchObject({ statusCode: 400, code: "BAD_REQUEST" })
    })

    test("repassa sem mudar erros que nao sao 4xx", () => {
        const internal = bodyParserError(500, "stream.not.readable")
        const plain = new Error("falha")

        expect(handled(internal)).toBe(internal)
        expect(handled(plain)).toBe(plain)
    })
})
