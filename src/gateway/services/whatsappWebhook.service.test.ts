import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { BackendClient, WhatsappSessionResponse } from "../clients/backend.client"
import { MessageProvider, ParsedIncoming } from "../gateways/messageProvider"
import { OutgoingMessageValidationError } from "../gateways/outgoingMessage.validation"
import { IncomingMessage, OutgoingMessage } from "../types/message.types"
import { MemoryMessageDeduplicator } from "./messageDeduplicator"
import { createPhoneQueue } from "./phoneQueue"
import { createWhatsappWebhookService } from "./whatsappWebhook.service"

const NOW = Date.parse("2026-10-02T12:00:00Z")
const PHONE = "5500000000001"
const OTHER_PHONE = "5500000000002"
const CITIZEN_TEXT = "Texto do cidadao 8472"

function textMessage(id: string, from = PHONE, text = CITIZEN_TEXT): IncomingMessage {
    return { id, from, timestampMs: NOW - 1000, text }
}

function reply(overrides: Partial<WhatsappSessionResponse["reply"]> = {}): WhatsappSessionResponse {
    return { sessionId: "42", newSession: false, reply: { text: "Escolha uma categoria", step: "AWAITING_CATEGORY", ...overrides } }
}

function deferred<T>() {
    let resolve!: (value: T) => void
    const promise = new Promise<T>((res) => {
        resolve = res
    })
    return { promise, resolve }
}

describe("WhatsApp webhook service", () => {
    const createWhatsappSession = vi.fn<BackendClient["createWhatsappSession"]>()
    const parseIncoming = vi.fn<MessageProvider["parseIncoming"]>()
    const send = vi.fn<MessageProvider["send"]>()
    const backend: BackendClient = { createWhatsappSession }
    const provider: MessageProvider = { verifySignature: vi.fn(), parseIncoming, send }
    let deduplicator: MemoryMessageDeduplicator
    let logSpy: ReturnType<typeof vi.spyOn>
    let errorSpy: ReturnType<typeof vi.spyOn>

    function service() {
        return createWhatsappWebhookService({
            backend,
            provider,
            deduplicator,
            queue: createPhoneQueue(),
            now: () => NOW,
        })
    }

    function incoming(...messages: IncomingMessage[]): ParsedIncoming {
        return { messages, ignored: [] }
    }

    function loggedOutput(): string {
        return [...logSpy.mock.calls, ...errorSpy.mock.calls].map((call) => call.join(" ")).join("\n")
    }

    beforeEach(() => {
        vi.clearAllMocks()
        deduplicator = new MemoryMessageDeduplicator(300_000)
        send.mockResolvedValue(undefined)
        logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined)
        errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test("repassa mensagem de texto ao backend so com phone e text", async () => {
        parseIncoming.mockReturnValue(incoming(textMessage("wamid.1")))
        createWhatsappSession.mockResolvedValue(reply())

        const result = await service()({})

        expect(createWhatsappSession).toHaveBeenCalledWith({ phone: PHONE, text: CITIZEN_TEXT })
        expect(result).toEqual({ results: [{ status: "processed", messageId: "wamid.1" }] })
    })

    test("repassa a opcao escolhida ao backend so com phone e optionId", async () => {
        parseIncoming.mockReturnValue(incoming({ id: "wamid.2", from: PHONE, optionId: "categoria-3" }))
        createWhatsappSession.mockResolvedValue(reply())

        await service()({})

        expect(createWhatsappSession).toHaveBeenCalledWith({ phone: PHONE, optionId: "categoria-3" })
    })

    test("envia reply.text como texto quando a resposta nao tem messages", async () => {
        parseIncoming.mockReturnValue(incoming(textMessage("wamid.1")))
        createWhatsappSession.mockResolvedValue(reply({ text: "Escolha uma categoria" }))

        await service()({})

        expect(send).toHaveBeenCalledOnce()
        expect(send).toHaveBeenCalledWith(PHONE, { type: "text", text: "Escolha uma categoria" })
    })

    test("envia cada item de reply.messages em ordem e nao envia reply.text a parte", async () => {
        const messages: OutgoingMessage[] = [
            { type: "text", text: "Primeiro" },
            { type: "list", text: "Escolha", buttonText: "Ver", rows: [{ id: "a", title: "A" }] },
            { type: "buttons", text: "Resolveu?", buttons: [{ id: "sim", title: "Sim" }] },
        ]
        const order: string[] = []
        send.mockImplementation(async (_to, message) => {
            order.push(`start:${message.text}`)
            await Promise.resolve()
            order.push(`end:${message.text}`)
        })
        parseIncoming.mockReturnValue(incoming(textMessage("wamid.1")))
        createWhatsappSession.mockResolvedValue(reply({ text: "Nao enviar", messages }))

        await service()({})

        expect(send.mock.calls.map((call) => call[1])).toEqual(messages)
        expect(order).toEqual([
            "start:Primeiro",
            "end:Primeiro",
            "start:Escolha",
            "end:Escolha",
            "start:Resolveu?",
            "end:Resolveu?",
        ])
    })

    test("nao envia nada quando reply.text vem vazio e sem messages", async () => {
        parseIncoming.mockReturnValue(incoming(textMessage("wamid.1")))
        createWhatsappSession.mockResolvedValue(reply({ text: "", messages: [] }))

        await service()({})

        expect(send).not.toHaveBeenCalled()
    })

    test("chama o backend uma vez so para a mesma mensagem e ignora a repetida", async () => {
        parseIncoming.mockReturnValue(incoming(textMessage("wamid.1")))
        createWhatsappSession.mockResolvedValue(reply())
        const handle = service()
        await handle({})

        const second = await handle({})

        expect(createWhatsappSession).toHaveBeenCalledOnce()
        expect(second).toEqual({
            results: [{ status: "ignored", reason: "duplicate_message", messageId: "wamid.1" }],
        })
    })

    test("ignora mensagem mais antiga que 5 minutos e processa a sem timestamp", async () => {
        parseIncoming.mockReturnValue(
            incoming(
                { id: "wamid.velha", from: PHONE, timestampMs: NOW - 300_001, text: "oi" },
                { id: "wamid.sem", from: PHONE, text: "oi" },
            ),
        )
        createWhatsappSession.mockResolvedValue(reply())

        const result = await service()({})

        expect(result).toEqual({
            results: [
                { status: "ignored", reason: "stale_message", messageId: "wamid.velha" },
                { status: "processed", messageId: "wamid.sem" },
            ],
        })
        expect(createWhatsappSession).toHaveBeenCalledOnce()
    })

    test("devolve e loga os descartes do parse sem chamar o backend", async () => {
        parseIncoming.mockReturnValue({
            messages: [],
            ignored: [{ reason: "status_update", messageId: "wamid.status" }, { reason: "unsupported_field" }],
        })

        const result = await service()({})

        expect(result).toEqual({
            results: [
                { status: "ignored", reason: "status_update", messageId: "wamid.status" },
                { status: "ignored", reason: "unsupported_field" },
            ],
        })
        expect(createWhatsappSession).not.toHaveBeenCalled()
        expect(send).not.toHaveBeenCalled()
        expect(loggedOutput()).toContain("status_update")
    })

    test("envia toda a resposta da primeira mensagem antes de chamar o backend para a segunda do mesmo telefone", async () => {
        const events: string[] = []
        const slow = deferred<WhatsappSessionResponse>()
        createWhatsappSession.mockImplementation(async (input) => {
            events.push(`backend:${input.text}`)
            return input.text === "primeira" ? slow.promise : reply({ text: "resposta-2" })
        })
        send.mockImplementation(async (_to, message) => {
            events.push(`send:${message.text}`)
        })
        const handle = service()
        parseIncoming.mockReturnValueOnce(incoming(textMessage("wamid.1", PHONE, "primeira")))
        parseIncoming.mockReturnValueOnce(incoming(textMessage("wamid.2", PHONE, "segunda")))

        const first = handle({})
        const second = handle({})
        await new Promise((resolve) => setTimeout(resolve, 10))
        slow.resolve(reply({ messages: [{ type: "text", text: "resposta-1a" }, { type: "text", text: "resposta-1b" }] }))
        await Promise.all([first, second])

        expect(events).toEqual([
            "backend:primeira",
            "send:resposta-1a",
            "send:resposta-1b",
            "backend:segunda",
            "send:resposta-2",
        ])
    })

    test("nao faz um telefone esperar a mensagem de outro", async () => {
        const events: string[] = []
        const slow = deferred<WhatsappSessionResponse>()
        createWhatsappSession.mockImplementation(async (input) => {
            events.push(`backend:${input.phone}`)
            return input.phone === PHONE ? slow.promise : reply({ text: "outro" })
        })
        const handle = service()
        parseIncoming.mockReturnValueOnce(incoming(textMessage("wamid.1", PHONE)))
        parseIncoming.mockReturnValueOnce(incoming(textMessage("wamid.2", OTHER_PHONE)))

        const first = handle({})
        await handle({})

        expect(events).toEqual([`backend:${PHONE}`, `backend:${OTHER_PHONE}`])
        expect(send).toHaveBeenCalledWith(OTHER_PHONE, { type: "text", text: "outro" })
        slow.resolve(reply())
        await first
    })

    test("libera o id e rejeita quando o backend falha, e a reentrega e processada", async () => {
        parseIncoming.mockReturnValue(incoming(textMessage("wamid.1")))
        createWhatsappSession.mockRejectedValueOnce(new Error("Backend returned HTTP 500"))
        createWhatsappSession.mockResolvedValueOnce(reply())
        const handle = service()

        await expect(handle({})).rejects.toThrow("Backend returned HTTP 500")
        const redelivery = await handle({})

        expect(redelivery).toEqual({ results: [{ status: "processed", messageId: "wamid.1" }] })
        expect(createWhatsappSession).toHaveBeenCalledTimes(2)
        expect(send).toHaveBeenCalledOnce()
    })

    test("mantem o id marcado e loga send_failed sem telefone nem texto quando o envio falha", async () => {
        parseIncoming.mockReturnValue(incoming(textMessage("wamid.1")))
        createWhatsappSession.mockResolvedValue(reply({ text: `Resposta para ${CITIZEN_TEXT}` }))
        send.mockRejectedValueOnce(new Error("Cloud API returned HTTP 500"))
        const handle = service()

        const result = await handle({})
        const redelivery = await handle({})

        expect(result).toEqual({ results: [{ status: "processed", messageId: "wamid.1" }] })
        expect(redelivery.results[0]).toMatchObject({ reason: "duplicate_message" })
        expect(createWhatsappSession).toHaveBeenCalledOnce()
        const output = loggedOutput()
        expect(output).toContain("send_failed")
        expect(output).toContain("wamid.1")
        expect(output).not.toContain(PHONE)
        expect(output).not.toContain(CITIZEN_TEXT)
    })

    test("loga invalid_outgoing_message e nao envia as mensagens seguintes", async () => {
        const messages: OutgoingMessage[] = [
            { type: "text", text: "Primeiro" },
            { type: "buttons", text: "Invalida", buttons: [] },
            { type: "text", text: "Terceiro" },
        ]
        send.mockImplementation(async (_to, message) => {
            if (message.type === "buttons") {
                throw new OutgoingMessageValidationError("invalid_button_count")
            }
        })
        parseIncoming.mockReturnValue(incoming(textMessage("wamid.1")))
        createWhatsappSession.mockResolvedValue(reply({ messages }))

        await service()({})

        expect(send.mock.calls.map((call) => call[1])).toEqual([messages[0], messages[1]])
        expect(loggedOutput()).toContain("invalid_outgoing_message")
    })

    test("processa normalmente a proxima mensagem do mesmo telefone depois de uma falha", async () => {
        parseIncoming.mockReturnValueOnce(incoming(textMessage("wamid.1")))
        parseIncoming.mockReturnValueOnce(incoming(textMessage("wamid.2")))
        createWhatsappSession.mockRejectedValueOnce(new Error("Backend returned HTTP 500"))
        createWhatsappSession.mockResolvedValueOnce(reply())
        const handle = service()

        const first = handle({})
        const second = handle({})

        await expect(first).rejects.toThrow()
        await expect(second).resolves.toEqual({ results: [{ status: "processed", messageId: "wamid.2" }] })
    })

    test("nunca registra o telefone nem o texto do cidadao nos logs", async () => {
        parseIncoming.mockReturnValue({
            messages: [
                textMessage("wamid.1"),
                { id: "wamid.velha", from: PHONE, timestampMs: NOW - 400_000, text: CITIZEN_TEXT },
            ],
            ignored: [{ reason: "unsupported_message", messageId: "wamid.audio" }],
        })
        createWhatsappSession.mockResolvedValue(reply({ messages: [{ type: "buttons", text: CITIZEN_TEXT, buttons: [] }] }))
        send.mockRejectedValue(new OutgoingMessageValidationError("invalid_button_count"))
        const handle = service()

        await handle({})
        await handle({})

        const output = loggedOutput()
        expect(output).toContain("duplicate_message")
        expect(output).not.toContain(PHONE)
        expect(output).not.toContain(CITIZEN_TEXT)
    })
})
