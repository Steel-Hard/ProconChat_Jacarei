import { createHmac } from "node:crypto"
import { afterEach, describe, expect, test, vi } from "vitest"
import { createCloudApiProvider } from "./cloudApi.gateway"
import { OutgoingMessageValidationError } from "./outgoingMessage.validation"
import { CloudApiConfig, CloudApiIncomingMessage } from "../types/cloudApi.types"

const config: CloudApiConfig = {
    phoneNumberId: "100000000000001",
    accessToken: "test-only-access-token",
    appSecret: "test-only-app-secret",
    graphApiVersion: "v26.0",
}

function sign(body: string, secret = config.appSecret): string {
    return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`
}

function payloadWith(
    messages: CloudApiIncomingMessage[],
    overrides: { object?: string; field?: string; phoneNumberId?: string } = {},
) {
    return {
        object: overrides.object ?? "whatsapp_business_account",
        entry: [
            {
                id: "200000000000001",
                changes: [
                    {
                        field: overrides.field ?? "messages",
                        value: {
                            messaging_product: "whatsapp",
                            metadata: {
                                display_phone_number: "15550000000",
                                phone_number_id: overrides.phoneNumberId ?? config.phoneNumberId,
                            },
                            contacts: [{ profile: { name: "Pessoa Teste" }, wa_id: "5500000000001" }],
                            messages,
                        },
                    },
                ],
            },
        ],
    }
}

function okFetch() {
    return vi.fn().mockResolvedValue({ ok: true, status: 200 })
}

describe("Cloud API provider: verifySignature", () => {
    const provider = createCloudApiProvider({ getConfig: () => config, fetchFn: okFetch() })
    const body = JSON.stringify({ object: "whatsapp_business_account", entry: [] })

    test("aceita a assinatura HMAC-SHA256 do corpo cru com o App Secret", () => {
        expect(provider.verifySignature(Buffer.from(body), sign(body))).toBe(true)
    })

    test("recusa quando o cabecalho esta ausente", () => {
        expect(provider.verifySignature(Buffer.from(body), undefined)).toBe(false)
    })

    test("recusa assinatura sem o prefixo sha256=", () => {
        const header = sign(body).replace("sha256=", "")

        expect(provider.verifySignature(Buffer.from(body), header)).toBe(false)
    })

    test("recusa assinatura com tamanho diferente sem lancar excecao", () => {
        expect(() => provider.verifySignature(Buffer.from(body), "sha256=abcd")).not.toThrow()
        expect(provider.verifySignature(Buffer.from(body), "sha256=abcd")).toBe(false)
    })

    test("recusa assinatura feita com outro segredo ou corpo alterado em um byte", () => {
        const altered = body.replace("{", "{ ")

        expect(provider.verifySignature(Buffer.from(body), sign(body, "outro-segredo"))).toBe(false)
        expect(provider.verifySignature(Buffer.from(altered), sign(body))).toBe(false)
    })
})

describe("Cloud API provider: parseIncoming", () => {
    const provider = createCloudApiProvider({ getConfig: () => config, fetchFn: okFetch() })

    test("extrai mensagem de texto com o corpo sem espacos nas pontas e o timestamp em ms", () => {
        const result = provider.parseIncoming(
            payloadWith([
                { id: "wamid.1", from: "5500000000001", timestamp: "1790000000", type: "text", text: { body: "  oi  " } },
            ]),
        )

        expect(result).toEqual({
            messages: [{ id: "wamid.1", from: "5500000000001", timestampMs: 1_790_000_000_000, text: "oi" }],
            ignored: [],
        })
    })

    test("extrai o id da linha escolhida na lista como optionId", () => {
        const result = provider.parseIncoming(
            payloadWith([
                {
                    id: "wamid.2",
                    from: "5500000000001",
                    timestamp: "1790000000",
                    type: "interactive",
                    interactive: { type: "list_reply", list_reply: { id: "categoria-3", title: "Bancos" } },
                },
            ]),
        )

        expect(result.messages).toEqual([
            { id: "wamid.2", from: "5500000000001", timestampMs: 1_790_000_000_000, optionId: "categoria-3" },
        ])
    })

    test("extrai o id do botao tocado como optionId", () => {
        const result = provider.parseIncoming(
            payloadWith([
                {
                    id: "wamid.3",
                    from: "5500000000001",
                    type: "interactive",
                    interactive: { type: "button_reply", button_reply: { id: "resolveu-sim", title: "Sim" } },
                },
            ]),
        )

        expect(result.messages).toEqual([{ id: "wamid.3", from: "5500000000001", optionId: "resolveu-sim" }])
    })

    test("processa varias entry, changes e messages na ordem do payload", () => {
        const first = payloadWith([
            { id: "wamid.a", from: "5500000000001", type: "text", text: { body: "a" } },
            { id: "wamid.b", from: "5500000000001", type: "text", text: { body: "b" } },
        ])
        const second = payloadWith([{ id: "wamid.c", from: "5500000000002", type: "text", text: { body: "c" } }])
        const third = payloadWith([{ id: "wamid.d", from: "5500000000003", type: "text", text: { body: "d" } }])
        const firstEntry = first.entry[0]!
        firstEntry.changes.push(second.entry[0]!.changes[0]!)
        first.entry.push(third.entry[0]!)

        const result = provider.parseIncoming(first)

        expect(result.messages.map((message) => message.id)).toEqual(["wamid.a", "wamid.b", "wamid.c", "wamid.d"])
    })

    test("ignora tipos sem texto nem opcao, texto vazio e opcao sem id com unsupported_message", () => {
        const result = provider.parseIncoming(
            payloadWith([
                { id: "wamid.audio", from: "5500000000001", type: "audio" },
                { id: "wamid.vazio", from: "5500000000001", type: "text", text: { body: "   " } },
                {
                    id: "wamid.semid",
                    from: "5500000000001",
                    type: "interactive",
                    interactive: { type: "list_reply", list_reply: { id: "", title: "x" } },
                },
            ]),
        )

        expect(result).toEqual({
            messages: [],
            ignored: [
                { reason: "unsupported_message", messageId: "wamid.audio" },
                { reason: "unsupported_message", messageId: "wamid.vazio" },
                { reason: "unsupported_message", messageId: "wamid.semid" },
            ],
        })
    })

    test("ignora mensagem sem id ou sem telefone", () => {
        const result = provider.parseIncoming(
            payloadWith([
                { from: "5500000000001", type: "text", text: { body: "oi" } },
                { id: "wamid.semfrom", type: "text", text: { body: "oi" } },
            ]),
        )

        expect(result).toEqual({
            messages: [],
            ignored: [{ reason: "missing_message_id" }, { reason: "missing_phone", messageId: "wamid.semfrom" }],
        })
    })

    test("ignora eventos que so trazem statuses", () => {
        const payload = {
            object: "whatsapp_business_account",
            entry: [
                {
                    changes: [
                        {
                            field: "messages",
                            value: {
                                metadata: { phone_number_id: config.phoneNumberId },
                                statuses: [{ id: "wamid.enviada", status: "delivered", recipient_id: "5500000000001" }],
                            },
                        },
                    ],
                },
            ],
        }

        const result = provider.parseIncoming(payload)

        expect(result).toEqual({ messages: [], ignored: [{ reason: "status_update", messageId: "wamid.enviada" }] })
    })

    test("ignora object, field ou phone_number_id diferentes do esperado", () => {
        const message = { id: "wamid.1", from: "5500000000001", type: "text", text: { body: "oi" } }

        const wrongObject = provider.parseIncoming(payloadWith([message], { object: "page" }))
        const wrongField = provider.parseIncoming(payloadWith([message], { field: "account_update" }))
        const wrongNumber = provider.parseIncoming(payloadWith([message], { phoneNumberId: "999" }))

        expect(wrongObject).toEqual({ messages: [], ignored: [{ reason: "unsupported_object" }] })
        expect(wrongField).toEqual({ messages: [], ignored: [{ reason: "unsupported_field" }] })
        expect(wrongNumber).toEqual({ messages: [], ignored: [{ reason: "unknown_phone_number_id" }] })
    })

    test("deixa o timestamp ausente quando ele nao e numero", () => {
        const result = provider.parseIncoming(
            payloadWith([
                { id: "wamid.1", from: "5500000000001", timestamp: "abc", type: "text", text: { body: "oi" } },
                { id: "wamid.2", from: "5500000000001", timestamp: "", type: "text", text: { body: "oi" } },
            ]),
        )

        expect(result.messages).toEqual([
            { id: "wamid.1", from: "5500000000001", text: "oi" },
            { id: "wamid.2", from: "5500000000001", text: "oi" },
        ])
    })

    test("le o phone_number_id configurado a cada chamada", () => {
        let current = config
        const dynamic = createCloudApiProvider({ getConfig: () => current, fetchFn: okFetch() })
        const payload = payloadWith([{ id: "wamid.1", from: "5500000000001", type: "text", text: { body: "oi" } }])
        current = { ...config, phoneNumberId: "outro" }

        const result = dynamic.parseIncoming(payload)

        expect(result.messages).toEqual([])
    })
})

describe("Cloud API provider: send", () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    test("envia texto para a Graph API com o token, a versao e timeout de 10 s", async () => {
        const fetchFn = okFetch()
        const timeoutSpy = vi.spyOn(AbortSignal, "timeout")
        const provider = createCloudApiProvider({ getConfig: () => config, fetchFn })

        await provider.send("5500000000001", { type: "text", text: "Ola" })

        expect(fetchFn).toHaveBeenCalledOnce()
        const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit]
        expect(url).toBe("https://graph.facebook.com/v26.0/100000000000001/messages")
        expect(init.method).toBe("POST")
        expect(init.headers).toEqual({
            "Content-Type": "application/json",
            Authorization: "Bearer test-only-access-token",
        })
        expect(JSON.parse(init.body as string)).toEqual({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: "5500000000001",
            type: "text",
            text: { body: "Ola", preview_url: false },
        })
        expect(timeoutSpy).toHaveBeenCalledWith(10_000)
        expect(init.signal).toBeInstanceOf(AbortSignal)
    })

    test("envia lista interativa com uma secao e descricao so quando houver", async () => {
        const fetchFn = okFetch()
        const provider = createCloudApiProvider({ getConfig: () => config, fetchFn })

        await provider.send("5500000000001", {
            type: "list",
            text: "Escolha uma categoria",
            buttonText: "Ver categorias",
            rows: [
                { id: "cat-1", title: "Bancos", description: "Tarifas e cartoes" },
                { id: "cat-2", title: "Telefonia" },
            ],
        })

        const [, init] = fetchFn.mock.calls[0] as [string, RequestInit]
        expect(JSON.parse(init.body as string)).toEqual({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: "5500000000001",
            type: "interactive",
            interactive: {
                type: "list",
                body: { text: "Escolha uma categoria" },
                action: {
                    button: "Ver categorias",
                    sections: [
                        {
                            rows: [
                                { id: "cat-1", title: "Bancos", description: "Tarifas e cartoes" },
                                { id: "cat-2", title: "Telefonia" },
                            ],
                        },
                    ],
                },
            },
        })
    })

    test("envia botoes de resposta", async () => {
        const fetchFn = okFetch()
        const provider = createCloudApiProvider({ getConfig: () => config, fetchFn })

        await provider.send("5500000000001", {
            type: "buttons",
            text: "Resolveu?",
            buttons: [
                { id: "sim", title: "Sim" },
                { id: "nao", title: "Nao" },
            ],
        })

        const [, init] = fetchFn.mock.calls[0] as [string, RequestInit]
        expect(JSON.parse(init.body as string)).toEqual({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: "5500000000001",
            type: "interactive",
            interactive: {
                type: "button",
                body: { text: "Resolveu?" },
                action: {
                    buttons: [
                        { type: "reply", reply: { id: "sim", title: "Sim" } },
                        { type: "reply", reply: { id: "nao", title: "Nao" } },
                    ],
                },
            },
        })
    })

    test("rejeita com o status HTTP e sem o token quando a Graph API falha", async () => {
        const fetchFn = vi.fn().mockResolvedValue({
            ok: false,
            status: 401,
            json: () => Promise.resolve({ error: { message: "token test-only-access-token invalido" } }),
            text: () => Promise.resolve("token test-only-access-token invalido"),
        })
        const provider = createCloudApiProvider({ getConfig: () => config, fetchFn })

        const error = await provider.send("5500000000001", { type: "text", text: "Ola" }).catch((e: Error) => e)

        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe("Cloud API returned HTTP 401")
        expect((error as Error).message).not.toContain(config.accessToken)
    })

    test("nao envia mensagem fora dos limites e rejeita com erro de validacao", async () => {
        const fetchFn = okFetch()
        const provider = createCloudApiProvider({ getConfig: () => config, fetchFn })

        const result = provider.send("5500000000001", {
            type: "buttons",
            text: "Escolha",
            buttons: [
                { id: "1", title: "Um" },
                { id: "2", title: "Dois" },
                { id: "3", title: "Tres" },
                { id: "4", title: "Quatro" },
            ],
        })

        await expect(result).rejects.toBeInstanceOf(OutgoingMessageValidationError)
        expect(fetchFn).not.toHaveBeenCalled()
    })
})
