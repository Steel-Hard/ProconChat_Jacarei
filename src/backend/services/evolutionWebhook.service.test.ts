import { beforeEach, describe, expect, test, vi } from "vitest"
import { MessageGateway } from "../gateways/evolution.gateway"
import { SessionRepository } from "../repositories/session.repository"
import { createEvolutionWebhookService } from "./evolutionWebhook.service"

const payload = {
    event: "messages.upsert",
    instance: "procon",
    data: {
        key: {
            remoteJid: "5511999999999@s.whatsapp.net",
            fromMe: false,
            id: "message-id",
        },
        message: { conversation: "Preciso de orientacao" },
    },
}

describe("Evolution webhook service", () => {
    const findOrCreateActive = vi.fn()
    const sendText = vi.fn()
    const sessions: SessionRepository = { findOrCreateActive }
    const messages: MessageGateway = { sendText }
    const processEvolutionWebhook = createEvolutionWebhookService({ sessions, messages })

    beforeEach(() => {
        vi.clearAllMocks()
        process.env.PHONE_HASH_SECRET = "test-secret"
        process.env.EVOLUTION_AUTO_REPLY_ENABLED = "false"
    })

    test("ignora eventos que nao representam nova mensagem", async () => {
        await expect(processEvolutionWebhook({ event: "connection.update" })).resolves.toEqual({
            status: "ignored",
            reason: "unsupported_event",
        })
        expect(findOrCreateActive).not.toHaveBeenCalled()
    })

    test("ignora mensagens enviadas pelo proprio bot", async () => {
        await expect(
            processEvolutionWebhook({
                ...payload,
                data: { ...payload.data, key: { ...payload.data.key, fromMe: true } },
            }),
        ).resolves.toEqual({ status: "ignored", reason: "outgoing_message" })
        expect(findOrCreateActive).not.toHaveBeenCalled()
    })

    test("cria sessao sem persistir o telefone em texto puro", async () => {
        findOrCreateActive.mockResolvedValueOnce({ id: "42", created: true })

        await expect(processEvolutionWebhook(payload)).resolves.toEqual({
            status: "processed",
            sessionId: "42",
            newSession: true,
        })

        const phoneHash = findOrCreateActive.mock.calls[0]?.[0]
        expect(phoneHash).toMatch(/^[a-f0-9]{64}$/)
        expect(phoneHash).not.toContain("5511999999999")
        expect(sendText).not.toHaveBeenCalled()
    })

    test("reutiliza uma sessao ativa", async () => {
        findOrCreateActive.mockResolvedValueOnce({ id: "42", created: false })

        await expect(processEvolutionWebhook(payload)).resolves.toEqual({
            status: "processed",
            sessionId: "42",
            newSession: false,
        })
        expect(findOrCreateActive).toHaveBeenCalledOnce()
    })

    test("envia saudacao apenas para uma sessao nova e quando habilitado", async () => {
        process.env.EVOLUTION_AUTO_REPLY_ENABLED = "true"
        findOrCreateActive.mockResolvedValueOnce({ id: "42", created: true })

        await processEvolutionWebhook(payload)

        expect(sendText).toHaveBeenCalledWith({
            instance: "procon",
            number: "5511999999999",
            text: expect.stringContaining("Procon Jacarei"),
        })
    })
})
