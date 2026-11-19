import { createHmac } from "node:crypto"
import request from "supertest"
import { expect } from "vitest"
import type { Express } from "express"
import { E2E_WHATSAPP } from "./whatsappSettingsDb"
import type { MetaFake, SentMessage } from "./metaFake"

const MAX_PAGES = 30

let messageCounter = 0

function nextMessageId(): string {
    messageCounter += 1
    return `wamid.in.${process.pid}.${Date.now()}.${messageCounter}`
}

function webhookPayload(phone: string, input: { text: string } | { optionId: string }) {
    const base = { from: phone, id: nextMessageId(), timestamp: String(Math.floor(Date.now() / 1000)) }
    const message =
        "text" in input
            ? { ...base, type: "text", text: { body: input.text } }
            : {
                  ...base,
                  type: "interactive",
                  interactive: { type: "list_reply", list_reply: { id: input.optionId, title: input.optionId } },
              }
    return {
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
                            messages: [message],
                        },
                    },
                ],
            },
        ],
    }
}

export function createCitizen(gateway: Express, meta: MetaFake, phone: string) {
    let lastReply: SentMessage[] = []

    async function post(input: { text: string } | { optionId: string }): Promise<SentMessage[]> {
        const raw = JSON.stringify(webhookPayload(phone, input))
        const signature = `sha256=${createHmac("sha256", E2E_WHATSAPP.appSecret).update(raw).digest("hex")}`
        const callsBefore = meta.graphCalls.length

        const response = await request(gateway)
            .post("/webhooks/whatsapp")
            .set("Content-Type", "application/json")
            .set("X-Hub-Signature-256", signature)
            .send(raw)

        expect(response.status).toBe(200)
        expect(response.body.data.results).toEqual([expect.objectContaining({ status: "processed" })])

        lastReply = meta.sentSince(callsBefore)
        for (const message of lastReply) {
            expect(message.to).toBe(phone)
        }
        return lastReply
    }

    function optionIds(): string[] {
        return lastReply.flatMap((message) => message.optionIds)
    }

    function replyText(): string {
        return lastReply.map((message) => message.text).join("\n")
    }

    async function tap(optionId: string): Promise<SentMessage[]> {
        expect(optionIds()).toContain(optionId)
        return post({ optionId })
    }

    async function tapAcrossPages(wanted: (id: string) => boolean): Promise<string> {
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
        say: (text: string) => post({ text }),
        tap,
        tapAcrossPages,
        optionIds,
        replyText,
        firstSlotId: () => optionIds().find((id) => id.startsWith("slot_")),
        slotIds: () => optionIds().filter((id) => id.startsWith("slot_")),
    }
}

export type Citizen = ReturnType<typeof createCitizen>
