import { Request, Response } from "express"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { receiveEvolutionWebhook } from "./evolutionWebhook.controller"
import { processEvolutionWebhook } from "../services/evolutionWebhook.service"

vi.mock("../services/evolutionWebhook.service", () => ({
    processEvolutionWebhook: vi.fn(),
}))

function buildResponse(): Response {
    const res = {} as Response
    res.status = vi.fn().mockReturnValue(res)
    res.json = vi.fn().mockReturnValue(res)
    return res
}

describe("receiveEvolutionWebhook", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        process.env.EVOLUTION_WEBHOOK_TOKEN = "test-only-webhook-token"
    })

    test("responde 202 com o resultado do service quando o token e valido", async () => {
        vi.mocked(processEvolutionWebhook).mockResolvedValue({
            status: "processed",
            sessionId: "42",
            newSession: true,
        })
        const req = {
            query: { token: "test-only-webhook-token" },
            body: { event: "messages.upsert" },
        } as unknown as Request
        const res = buildResponse()
        const next = vi.fn()

        await receiveEvolutionWebhook(req, res, next)

        expect(res.status).toHaveBeenCalledWith(202)
        expect(res.json).toHaveBeenCalledWith({
            data: { status: "processed", sessionId: "42", newSession: true },
        })
        expect(next).not.toHaveBeenCalled()
    })

    test("delega ao next com UnauthorizedError quando o token e invalido", async () => {
        const req = {
            query: { token: "token-errado" },
            body: { event: "messages.upsert" },
        } as unknown as Request
        const res = buildResponse()
        const next = vi.fn()

        await receiveEvolutionWebhook(req, res, next)

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }))
        expect(processEvolutionWebhook).not.toHaveBeenCalled()
    })
})
