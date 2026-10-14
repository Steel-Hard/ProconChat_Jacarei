import { Request, Response } from "express"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import WhatsappSessionController from "./whatsappSession.controller"
import UnauthorizedError from "../errors/UnauthorizedError"
import { ConversationFlowInput, ConversationFlowResult } from "../services/conversationFlow.service"

const input: ConversationFlowInput = { phone: "5500000000001", text: "oi" }
const result = { sessionId: "sessao-1", newSession: true, reply: { text: "Ola" } } as unknown as ConversationFlowResult

function buildRequest(headers: Record<string, string>): Request {
    return {
        header: (name: string) => headers[name.toLowerCase()],
        body: input,
    } as unknown as Request
}

function buildResponse(): Response {
    const res = {} as Response
    res.status = vi.fn().mockReturnValue(res)
    res.json = vi.fn().mockReturnValue(res)
    return res
}

describe("WhatsappSessionController", () => {
    let processMessage: ReturnType<typeof vi.fn<(input: ConversationFlowInput) => Promise<ConversationFlowResult>>>
    let controller: WhatsappSessionController

    beforeEach(() => {
        processMessage = vi.fn<(input: ConversationFlowInput) => Promise<ConversationFlowResult>>()
        controller = new WhatsappSessionController({ processMessage })
    })

    afterEach(() => {
        vi.unstubAllEnvs()
    })

    test("responde 202 com { data } quando o token interno confere", async () => {
        processMessage.mockResolvedValue(result)
        const res = buildResponse()
        const next = vi.fn()

        await controller.create(buildRequest({ "x-internal-token": "test-only-internal-token" }), res, next)

        expect(processMessage).toHaveBeenCalledWith(input)
        expect(res.status).toHaveBeenCalledWith(202)
        expect(res.json).toHaveBeenCalledWith({ data: result })
        expect(next).not.toHaveBeenCalled()
    })

    test("delega UnauthorizedError ao next sem chamar o servico quando falta o token interno", async () => {
        const res = buildResponse()
        const next = vi.fn()

        await controller.create(buildRequest({}), res, next)

        expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError))
        expect(next.mock.calls[0][0].message).toBe("Invalid gateway internal token")
        expect(processMessage).not.toHaveBeenCalled()
        expect(res.status).not.toHaveBeenCalled()
    })

    test("delega UnauthorizedError ao next sem chamar o servico quando o token interno e diferente", async () => {
        const res = buildResponse()
        const next = vi.fn()

        await controller.create(buildRequest({ "x-internal-token": "token-errado" }), res, next)

        expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError))
        expect(next.mock.calls[0][0].message).toBe("Invalid gateway internal token")
        expect(processMessage).not.toHaveBeenCalled()
        expect(res.status).not.toHaveBeenCalled()
    })

    test("delega ao next o erro do servico", async () => {
        const error = new Error("falha inesperada")
        processMessage.mockRejectedValue(error)
        const res = buildResponse()
        const next = vi.fn()

        await controller.create(buildRequest({ "x-internal-token": "test-only-internal-token" }), res, next)

        expect(next).toHaveBeenCalledWith(error)
        expect(res.status).not.toHaveBeenCalled()
    })

    test("le o GATEWAY_INTERNAL_TOKEN na hora da requisicao", async () => {
        processMessage.mockResolvedValue(result)
        vi.stubEnv("GATEWAY_INTERNAL_TOKEN", "token-trocado")
        const res = buildResponse()
        const next = vi.fn()

        await controller.create(buildRequest({ "x-internal-token": "token-trocado" }), res, next)

        expect(res.status).toHaveBeenCalledWith(202)
        expect(next).not.toHaveBeenCalled()
    })
})
