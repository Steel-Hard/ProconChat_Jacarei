import { createHmac, timingSafeEqual } from "node:crypto"
import { Request, Response } from "express"
import { beforeEach, describe, expect, test, vi } from "vitest"
import WhatsappWebhookController from "./whatsappWebhook.controller"
import BadRequestError from "../errors/BadRequestError"
import { processWhatsappWebhook } from "../services/whatsappWebhook.service"
import { WhatsappWebhookResult } from "../types/whatsappWebhook.types"

vi.mock("../services/whatsappWebhook.service", () => ({
    processWhatsappWebhook: vi.fn(),
}))

vi.mock("node:crypto", async (importOriginal) => {
    const actual = await importOriginal<typeof import("node:crypto")>()
    return { ...actual, timingSafeEqual: vi.fn(actual.timingSafeEqual) }
})

const controller = new WhatsappWebhookController()

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

        controller.verify(req, res, next)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.type).toHaveBeenCalledWith("text/plain")
        expect(res.send).toHaveBeenCalledWith("abc")
        expect(next).not.toHaveBeenCalled()
    })

    test("delega ao next com 401 e nao chama o service quando a assinatura nao confere", async () => {
        const res = buildResponse()
        const next = vi.fn()

        await controller.receive(requestWith(Buffer.from("{}"), "sha256=00"), res, next)

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401, code: "UNAUTHORIZED" }))
        expect(processWhatsappWebhook).not.toHaveBeenCalled()
    })

    test("responde 200 com o resultado do service quando a assinatura confere", async () => {
        vi.mocked(processWhatsappWebhook).mockResolvedValue({ results: [] })
        const body = Buffer.from(JSON.stringify({ object: "whatsapp_business_account", entry: [] }))
        const signature = `sha256=${createHmac("sha256", "test-only-app-secret").update(body).digest("hex")}`
        const res = buildResponse()
        const next = vi.fn()

        await controller.receive(requestWith(body, signature), res, next)

        expect(processWhatsappWebhook).toHaveBeenCalledWith({ object: "whatsapp_business_account", entry: [] })
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith({ data: { results: [] } })
        expect(next).not.toHaveBeenCalled()
    })

    test("compara o verify token em tempo constante", () => {
        const res = buildResponse()
        const next = vi.fn()

        controller.verify(verificationRequest("test-only-verify-token"), res, next)

        expect(timingSafeEqual).toHaveBeenCalledWith(
            Buffer.from("test-only-verify-token"),
            Buffer.from("test-only-verify-token"),
        )
        expect(res.send).toHaveBeenCalledWith("abc")
    })

    test("recusa com 403 o verify token de mesmo tamanho e conteudo diferente", () => {
        const res = buildResponse()
        const next = vi.fn()

        controller.verify(verificationRequest("test-only-verify-tokeX"), res, next)

        expect(timingSafeEqual).toHaveBeenCalled()
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403, code: "FORBIDDEN" }))
        expect(res.send).not.toHaveBeenCalled()
    })

    test("recusa com 403 o verify token de outro tamanho sem chamar timingSafeEqual", () => {
        const res = buildResponse()
        const next = vi.fn()

        expect(() => controller.verify(verificationRequest("curto"), res, next)).not.toThrow()

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
        controller.handleRawBodyError(error, {} as Request, buildResponse(), next)
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

describe("WhatsappWebhookController com dependencias injetadas", () => {
    beforeEach(() => vi.clearAllMocks())

    function buildDependencies() {
        return {
            signatures: { verifySignature: vi.fn<(rawBody: Buffer, signatureHeader: string | undefined) => boolean>() },
            processWebhook: vi.fn<(payload: unknown) => Promise<WhatsappWebhookResult>>(),
        }
    }

    test("delega BadRequestError ao next sem chamar o processador quando o corpo assinado nao e JSON", async () => {
        const dependencies = buildDependencies()
        dependencies.signatures.verifySignature.mockReturnValue(true)
        const injected = new WhatsappWebhookController(dependencies)
        const res = buildResponse()
        const next = vi.fn()

        await injected.receive(requestWith(Buffer.from("nao-e-json"), "sha256=qualquer"), res, next)

        expect(next).toHaveBeenCalledWith(expect.any(BadRequestError))
        expect(next.mock.calls[0][0].message).toBe("Invalid JSON body")
        expect(dependencies.processWebhook).not.toHaveBeenCalled()
        expect(res.status).not.toHaveBeenCalled()
    })

    test("delega ao next o erro do processador do webhook", async () => {
        const dependencies = buildDependencies()
        const error = new Error("falha inesperada")
        dependencies.signatures.verifySignature.mockReturnValue(true)
        dependencies.processWebhook.mockRejectedValue(error)
        const injected = new WhatsappWebhookController(dependencies)
        const res = buildResponse()
        const next = vi.fn()

        await injected.receive(requestWith(Buffer.from("{}"), "sha256=qualquer"), res, next)

        expect(dependencies.processWebhook).toHaveBeenCalledWith({})
        expect(next).toHaveBeenCalledWith(error)
        expect(res.status).not.toHaveBeenCalled()
        expect(processWhatsappWebhook).not.toHaveBeenCalled()
    })

    test("usa o verificador de assinatura injetado com o corpo cru e o cabecalho X-Hub-Signature-256", async () => {
        const dependencies = buildDependencies()
        dependencies.signatures.verifySignature.mockReturnValue(true)
        dependencies.processWebhook.mockResolvedValue({ results: [] })
        const injected = new WhatsappWebhookController(dependencies)
        const body = Buffer.from(JSON.stringify({ object: "whatsapp_business_account", entry: [] }))
        const res = buildResponse()
        const next = vi.fn()

        await injected.receive(requestWith(body, "sha256=assinatura-falsa"), res, next)

        expect(dependencies.signatures.verifySignature).toHaveBeenCalledWith(body, "sha256=assinatura-falsa")
        expect(dependencies.processWebhook).toHaveBeenCalledWith({ object: "whatsapp_business_account", entry: [] })
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith({ data: { results: [] } })
        expect(next).not.toHaveBeenCalled()
    })

    test("trata como corpo vazio a requisicao cujo corpo nao e Buffer", async () => {
        const dependencies = buildDependencies()
        dependencies.signatures.verifySignature.mockReturnValue(false)
        const injected = new WhatsappWebhookController(dependencies)
        const req = {
            body: { object: "whatsapp_business_account" },
            get: (name: string) => (name.toLowerCase() === "x-hub-signature-256" ? "sha256=qualquer" : undefined),
        } as unknown as Request
        const next = vi.fn()

        await injected.receive(req, buildResponse(), next)

        expect(dependencies.signatures.verifySignature).toHaveBeenCalledWith(Buffer.alloc(0), "sha256=qualquer")
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401, code: "UNAUTHORIZED" }))
        expect(dependencies.processWebhook).not.toHaveBeenCalled()
    })

    test("mantem handleRawBodyError com quatro parametros tambem depois do bind", () => {
        const injected = new WhatsappWebhookController(buildDependencies())

        const bound = injected.handleRawBodyError.bind(injected)

        expect(injected.handleRawBodyError.length).toBe(4)
        expect(bound.length).toBe(4)
    })
})
