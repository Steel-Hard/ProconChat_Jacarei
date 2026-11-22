import { createHmac } from "node:crypto"
import { describe, expect, test } from "vitest"
import { buildWebhookBody, signWebhookBody } from "./helpers/citizen"
import { E2E_WHATSAPP } from "./helpers/whatsappSettingsDb"

interface ParsedMessage {
    from: string
    id: string
    type: string
    text?: { body: string }
    interactive?: { type: string; button_reply?: { id: string }; list_reply?: { id: string } }
}

function messageOf(rawBody: string): ParsedMessage {
    const parsed = JSON.parse(rawBody)
    return parsed.entry[0].changes[0].value.messages[0] as ParsedMessage
}

describe("buildWebhookBody", () => {
    test("monta uma mensagem de texto no formato da Cloud API", () => {
        const raw = buildWebhookBody("5512999990781", { text: "oi" }, "wamid.1")
        const parsed = JSON.parse(raw)

        expect(parsed.object).toBe("whatsapp_business_account")
        expect(parsed.entry[0].changes[0].value.metadata.phone_number_id).toBe(E2E_WHATSAPP.phoneNumberId)
        expect(messageOf(raw)).toMatchObject({ from: "5512999990781", id: "wamid.1", type: "text", text: { body: "oi" } })
    })

    test.each(["return_cancel", "resolved_no", "schedule_yes", "attendee_self", "cancel_yes"])(
        "envia %s como resposta de botao",
        (optionId) => {
            const message = messageOf(buildWebhookBody("5512999990781", { optionId }, "wamid.2"))

            expect(message.type).toBe("interactive")
            expect(message.interactive).toMatchObject({ type: "button_reply", button_reply: { id: optionId } })
        },
    )

    test.each(["cat_1", "q_9", "slot_2031-01-01T11:00:00.000Z", "page_2"])("envia %s como resposta de lista", (optionId) => {
        const message = messageOf(buildWebhookBody("5512999990781", { optionId }, "wamid.3"))

        expect(message.interactive).toMatchObject({ type: "list_reply", list_reply: { id: optionId } })
    })
})

describe("signWebhookBody", () => {
    test("assina o corpo com HMAC SHA-256 no formato sha256=hex", () => {
        const raw = '{"a":1}'
        const expected = createHmac("sha256", "segredo").update(raw).digest("hex")

        expect(signWebhookBody(raw, "segredo")).toBe(`sha256=${expected}`)
    })
})
