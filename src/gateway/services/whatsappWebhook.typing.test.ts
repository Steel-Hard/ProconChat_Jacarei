import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { BackendClient, WhatsappSessionResponse } from "../clients/backend.client"
import { MessageProvider, ParsedIncoming } from "../gateways/messageProvider"
import { IncomingMessage } from "../types/message.types"
import { MemoryMessageDeduplicator } from "./messageDeduplicator"
import { createPhoneQueue, PhoneQueue } from "./phoneQueue"
import { createWhatsappWebhookService } from "./whatsappWebhook.service"
import { messageRef } from "../utils/messageRef"

const NOW = Date.parse("2026-10-02T12:00:00Z")
const PHONE = "5500000000001"

function textMessage(id: string): IncomingMessage {
    return { id, from: PHONE, timestampMs: NOW - 1000, text: "sim" }
}

function typingReply(): WhatsappSessionResponse {
    return {
        sessionId: "42",
        newSession: false,
        reply: { text: "", step: "AWAITING_RESOLVED", messages: [], typing: true },
    }
}

describe("WhatsApp webhook service: indicador de digitação", () => {
    const createWhatsappSession = vi.fn<BackendClient["createWhatsappSession"]>()
    const parseIncoming = vi.fn<MessageProvider["parseIncoming"]>()
    const send = vi.fn<MessageProvider["send"]>()
    const showTyping = vi.fn<MessageProvider["showTyping"]>()
    const backend: BackendClient = {
        createWhatsappSession,
        getWhatsappConfig: vi.fn(),
        reportWebhookEvents: vi.fn().mockResolvedValue(undefined),
    }
    const provider: MessageProvider = {
        verifySignature: vi.fn(),
        parseIncoming,
        send,
        sendTemplate: vi.fn(),
        showTyping,
    }
    let logSpy: ReturnType<typeof vi.spyOn>

    function service(queue: PhoneQueue = createPhoneQueue()) {
        return createWhatsappWebhookService({
            backend,
            provider,
            deduplicator: new MemoryMessageDeduplicator(300_000),
            queue,
            now: () => NOW,
        })
    }

    function incoming(...messages: IncomingMessage[]): ParsedIncoming {
        return { messages, statuses: [], ignored: [], eventReceived: false }
    }

    beforeEach(() => {
        vi.clearAllMocks()
        send.mockResolvedValue(undefined)
        showTyping.mockResolvedValue(undefined)
        logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined)
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test("mostra digitando uma vez com o id da mensagem recebida e não envia nada quando o backend pede typing", async () => {
        parseIncoming.mockReturnValue(incoming(textMessage("wamid.typing")))
        createWhatsappSession.mockResolvedValue(typingReply())

        const result = await service()({})

        expect(showTyping).toHaveBeenCalledExactlyOnceWith("wamid.typing")
        expect(send).not.toHaveBeenCalled()
        expect(result).toEqual({ results: [{ status: "processed", messageId: "wamid.typing" }] })
    })

    test("registra typing_failed só com o messageRef e continua processed quando o indicador falha", async () => {
        parseIncoming.mockReturnValue(incoming(textMessage("wamid.falha")))
        createWhatsappSession.mockResolvedValue(typingReply())
        showTyping.mockRejectedValue(new Error(`Cloud API returned HTTP 400 para ${PHONE} wamid.falha`))

        const result = await service()({})

        expect(result).toEqual({ results: [{ status: "processed", messageId: "wamid.falha" }] })
        const logged = logSpy.mock.calls.map((call) => JSON.parse(String(call[0])))
        expect(logged).toEqual([
            expect.objectContaining({ event: "whatsapp_cloud_api", reason: "typing_failed", messageRef: messageRef("wamid.falha") }),
        ])
        const raw = JSON.stringify(logSpy.mock.calls)
        expect(raw).not.toContain(PHONE)
        expect(raw).not.toContain("wamid.falha")
    })

    test("não mostra digitando quando a reply não pede typing", async () => {
        parseIncoming.mockReturnValue(incoming(textMessage("wamid.lista")))
        createWhatsappSession.mockResolvedValue({
            sessionId: "42",
            newSession: false,
            reply: {
                text: "Escolha uma categoria",
                step: "AWAITING_CATEGORY",
                messages: [{ type: "list", text: "Escolha", buttonText: "Ver opções", rows: [{ id: "cat_1", title: "Compras" }] }],
            },
        })

        await service()({})

        expect(showTyping).not.toHaveBeenCalled()
        expect(send).toHaveBeenCalledOnce()
    })

    test("mostra digitando dentro da tarefa da fila do telefone, depois da tarefa anterior e antes da seguinte", async () => {
        const queue = createPhoneQueue()
        const events: string[] = []
        let releaseBlocker!: () => void
        const blocker = queue.run(PHONE, async () => {
            await new Promise<void>((resolve) => {
                releaseBlocker = resolve
            })
            events.push("blocker:done")
        })
        let releaseTyping!: () => void
        parseIncoming.mockReturnValue(incoming(textMessage("wamid.fila")))
        createWhatsappSession.mockResolvedValue(typingReply())
        showTyping.mockImplementation(async () => {
            events.push("typing:start")
            await new Promise<void>((resolve) => {
                releaseTyping = resolve
            })
            events.push("typing:end")
        })

        const processing = service(queue)({})
        for (let tick = 0; tick < 5; tick++) {
            await new Promise((resolve) => setImmediate(resolve))
        }
        const typedBeforeRelease = showTyping.mock.calls.length
        releaseBlocker()
        await blocker
        await vi.waitFor(() => expect(showTyping).toHaveBeenCalledOnce())
        const next = queue.run(PHONE, async () => {
            events.push("next")
        })
        for (let tick = 0; tick < 5; tick++) {
            await new Promise((resolve) => setImmediate(resolve))
        }
        releaseTyping()
        await Promise.all([processing, next])

        expect(typedBeforeRelease).toBe(0)
        expect(events).toEqual(["blocker:done", "typing:start", "typing:end", "next"])
    })
})
