import { createHmac } from "node:crypto"
import request from "supertest"
import { expect } from "vitest"
import type { E2eEnvironment } from "./e2eEnvironment"
import type { SentMessage } from "./metaFake"
import { E2E_WHATSAPP } from "./whatsappSettingsDb"

export type CitizenInput = { text: string } | { optionId: string }

const MAX_PAGES = 30
const BUTTON_OPTION_PREFIXES = ["return_", "cancel_", "resolved_", "schedule_", "attendee_"]

function isButtonOption(optionId: string): boolean {
    return BUTTON_OPTION_PREFIXES.some((prefix) => optionId.startsWith(prefix))
}

function messageOf(phone: string, input: CitizenInput, messageId: string): Record<string, unknown> {
    const base = { from: phone, id: messageId, timestamp: String(Math.floor(Date.now() / 1000)) }
    if ("text" in input) {
        return { ...base, type: "text", text: { body: input.text } }
    }
    const kind = isButtonOption(input.optionId) ? "button_reply" : "list_reply"
    return {
        ...base,
        type: "interactive",
        interactive: { type: kind, [kind]: { id: input.optionId, title: input.optionId } },
    }
}

export function buildWebhookBody(phone: string, input: CitizenInput, messageId: string): string {
    return JSON.stringify({
        object: "whatsapp_business_account",
        entry: [
            {
                id: "e2e-waba",
                changes: [
                    {
                        field: "messages",
                        value: {
                            messaging_product: "whatsapp",
                            metadata: { display_phone_number: "5512999990000", phone_number_id: E2E_WHATSAPP.phoneNumberId },
                            contacts: [{ wa_id: phone, profile: { name: "Cidadão E2E" } }],
                            messages: [messageOf(phone, input, messageId)],
                        },
                    },
                ],
            },
        ],
    })
}

export function signWebhookBody(rawBody: string, appSecret: string): string {
    return `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`
}

export interface Citizen {
    phone: string
    say(text: string): Promise<SentMessage[]>
    tap(optionId: string): Promise<SentMessage[]>
    tapAcrossPages(wanted: (optionId: string) => boolean): Promise<string>
    lastReply(): SentMessage[]
    optionIds(): string[]
    replyText(): string
    slotIds(): string[]
}

let messageCounter = 0

function nextMessageId(): string {
    messageCounter += 1
    return `wamid.in.${process.pid}.${Date.now()}.${messageCounter}`
}

export function createCitizen(env: E2eEnvironment, phone: string): Citizen {
    let lastReply: SentMessage[] = []

    async function post(input: CitizenInput): Promise<SentMessage[]> {
        const rawBody = buildWebhookBody(phone, input, nextMessageId())
        const callsBefore = env.meta.graphCalls.length

        const response = await request(env.gatewayUrl)
            .post("/webhooks/whatsapp")
            .set("Content-Type", "application/json")
            .set("X-Hub-Signature-256", signWebhookBody(rawBody, E2E_WHATSAPP.appSecret))
            .send(rawBody)

        expect(response.status).toBe(200)
        expect(response.body.data.results).toEqual([expect.objectContaining({ status: "processed" })])

        lastReply = env.meta.sentSince(callsBefore)
        for (const message of lastReply) {
            expect(message.to).toBe(phone)
        }
        return lastReply
    }

    function optionIds(): string[] {
        return lastReply.flatMap((message) => message.optionIds)
    }

    async function tapAcrossPages(wanted: (optionId: string) => boolean): Promise<string> {
        const visited = new Set<string>()
        for (let attempt = 0; attempt < MAX_PAGES; attempt += 1) {
            const found = optionIds().find(wanted)
            if (found) {
                await post({ optionId: found })
                return found
            }
            const nextPage = optionIds().find((id) => id.startsWith("page_") && !visited.has(id))
            if (!nextPage) {
                break
            }
            visited.add(nextPage)
            await post({ optionId: nextPage })
        }
        throw new Error(`Opção não encontrada nas páginas: ${optionIds().join(", ")}`)
    }

    return {
        phone,
        say: (text) => post({ text }),
        tap: async (optionId) => {
            expect(optionIds()).toContain(optionId)
            return post({ optionId })
        },
        tapAcrossPages,
        lastReply: () => lastReply,
        optionIds,
        replyText: () => lastReply.map((message) => message.text).join("\n"),
        slotIds: () => optionIds().filter((id) => id.startsWith("slot_")),
    }
}
