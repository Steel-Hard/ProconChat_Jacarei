import { afterEach, describe, expect, test, vi } from "vitest"
import { hashPhone } from "../services/whatsappSession.service"
import { hashProviderMessageId } from "./providerMessageHash"

const WAMID = "wamid.HBgNNTUxMjk5OTk5MDAwMBUCABEYEjE0QzdGRDQ4QkQ3RjFBMjMwQQA="

describe("hashProviderMessageId", () => {
    afterEach(() => {
        vi.unstubAllEnvs()
    })

    test("devolve 64 caracteres hexadecimais, igual para o mesmo wamid e diferente para outro wamid", () => {
        const first = hashProviderMessageId(WAMID)

        expect(first).toMatch(/^[0-9a-f]{64}$/)
        expect(hashProviderMessageId(WAMID)).toBe(first)
        expect(hashProviderMessageId(`${WAMID}x`)).not.toBe(first)
    })

    test("difere do hash do telefone para o mesmo texto", () => {
        expect(hashProviderMessageId(WAMID)).not.toBe(hashPhone(WAMID))
    })

    test("lanca erro sem PHONE_HASH_SECRET", () => {
        vi.stubEnv("PHONE_HASH_SECRET", "")

        expect(() => hashProviderMessageId(WAMID)).toThrow("PHONE_HASH_SECRET is not configured")
    })
})
