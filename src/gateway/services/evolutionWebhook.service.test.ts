import { beforeEach, describe, expect, test, vi } from "vitest"
import { BackendClient } from "../clients/backend.client"
import { MessageGateway } from "../gateways/evolution.gateway"
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
    const createWhatsappSession = vi.fn()
    const sendText = vi.fn()
    const backend: BackendClient = { createWhatsappSession }
    const messages: MessageGateway = { sendText }
    const processEvolutionWebhook = createEvolutionWebhookService({ backend, messages })

    beforeEach(() => {
        vi.clearAllMocks()
        process.env.EVOLUTION_AUTO_REPLY_ENABLED = "false"
    })

    test("ignora eventos que nao representam nova mensagem", async () => {
        await expect(processEvolutionWebhook({ event: "connection.update" })).resolves.toEqual({
            status: "ignored",
            reason: "unsupported_event",
        })
        expect(createWhatsappSession).not.toHaveBeenCalled()
    })

    test("ignora mensagens enviadas pelo proprio bot", async () => {
        await expect(
            processEvolutionWebhook({
                ...payload,
                data: { ...payload.data, key: { ...payload.data.key, fromMe: true } },
            }),
        ).resolves.toEqual({ status: "ignored", reason: "outgoing_message" })
        expect(createWhatsappSession).not.toHaveBeenCalled()
    })

    test("chama o backend com o telefone sem hash e sem o sufixo do jid", async () => {
        createWhatsappSession.mockResolvedValueOnce({
            sessionId: "42",
            newSession: true,
            reply: { text: "Escolha uma categoria", step: "AWAITING_CATEGORY" },
        })

        await expect(processEvolutionWebhook(payload)).resolves.toEqual({
            status: "processed",
            sessionId: "42",
            newSession: true,
            reply: { text: "Escolha uma categoria", step: "AWAITING_CATEGORY" },
        })

        expect(createWhatsappSession).toHaveBeenCalledWith({
            phone: "5511999999999",
            text: "Preciso de orientacao",
            providerInstance: "procon",
        })
        expect(sendText).not.toHaveBeenCalled()
    })

    test("reutiliza uma sessao ativa", async () => {
        createWhatsappSession.mockResolvedValueOnce({
            sessionId: "42",
            newSession: false,
            reply: { text: "Escolha uma pergunta", step: "AWAITING_QUESTION" },
        })

        await expect(processEvolutionWebhook(payload)).resolves.toEqual({
            status: "processed",
            sessionId: "42",
            newSession: false,
            reply: { text: "Escolha uma pergunta", step: "AWAITING_QUESTION" },
        })
        expect(createWhatsappSession).toHaveBeenCalledOnce()
    })

    test("envia a resposta do backend quando ha texto e o auto-reply esta habilitado", async () => {
        process.env.EVOLUTION_AUTO_REPLY_ENABLED = "true"
        createWhatsappSession.mockResolvedValueOnce({
            sessionId: "42",
            newSession: true,
            reply: { text: "Escolha uma categoria digitando o numero", step: "AWAITING_CATEGORY" },
        })

        await processEvolutionWebhook(payload)

        expect(sendText).toHaveBeenCalledWith({
            instance: "procon",
            number: "5511999999999",
            text: "Escolha uma categoria digitando o numero",
        })
    })

    test("nao envia resposta quando o auto-reply esta desabilitado mesmo com reply.text presente", async () => {
        process.env.EVOLUTION_AUTO_REPLY_ENABLED = "false"
        createWhatsappSession.mockResolvedValueOnce({
            sessionId: "42",
            newSession: true,
            reply: { text: "Escolha uma categoria digitando o numero", step: "AWAITING_CATEGORY" },
        })

        await processEvolutionWebhook(payload)

        expect(sendText).not.toHaveBeenCalled()
    })
})
