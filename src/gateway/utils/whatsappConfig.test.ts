import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { DEFAULT_GRAPH_API_VERSION, readWhatsAppConfigFromEnv } from "./whatsappConfig"

const names = [
    "WHATSAPP_PHONE_NUMBER_ID",
    "WHATSAPP_ACCESS_TOKEN",
    "WHATSAPP_APP_SECRET",
    "WHATSAPP_VERIFY_TOKEN",
    "WHATSAPP_GRAPH_API_VERSION",
]

describe("readWhatsAppConfigFromEnv", () => {
    let originals: Record<string, string | undefined> = {}

    beforeEach(() => {
        originals = Object.fromEntries(names.map((name) => [name, process.env[name]]))
    })

    afterEach(() => {
        for (const name of names) {
            const original = originals[name]
            if (original === undefined) {
                delete process.env[name]
            } else {
                process.env[name] = original
            }
        }
    })

    test("le as variaveis no momento da chamada", () => {
        process.env.WHATSAPP_PHONE_NUMBER_ID = "100000000000001"
        process.env.WHATSAPP_ACCESS_TOKEN = "token-1"
        process.env.WHATSAPP_APP_SECRET = "secret-1"
        process.env.WHATSAPP_VERIFY_TOKEN = "verify-1"
        process.env.WHATSAPP_GRAPH_API_VERSION = "v25.0"
        const first = readWhatsAppConfigFromEnv()

        process.env.WHATSAPP_ACCESS_TOKEN = "token-2"
        const second = readWhatsAppConfigFromEnv()

        expect(first).toEqual({
            phoneNumberId: "100000000000001",
            accessToken: "token-1",
            appSecret: "secret-1",
            verifyToken: "verify-1",
            graphApiVersion: "v25.0",
        })
        expect(second.accessToken).toBe("token-2")
    })

    test("usa a versao padrao v26.0 da Graph API quando a variavel nao esta definida", () => {
        delete process.env.WHATSAPP_GRAPH_API_VERSION

        const config = readWhatsAppConfigFromEnv()

        expect(DEFAULT_GRAPH_API_VERSION).toBe("v26.0")
        expect(config.graphApiVersion).toBe("v26.0")
    })
})
