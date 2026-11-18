import { describe, expect, it } from "vitest"
import whatsAppConnectionReasonOf from "@/utils/whatsAppConnectionReasonOf"

function errorWith(code: string) {
    return { status: 422, data: { error: { code } } }
}

describe("whatsAppConnectionReasonOf", () => {
    it.each([
        "INVALID_TOKEN",
        "INVALID_APP_SECRET",
        "PHONE_NUMBER_NOT_FOUND",
        "BUSINESS_ACCOUNT_NOT_FOUND",
        "PHONE_NOT_IN_ACCOUNT",
        "MISSING_PERMISSION",
        "META_UNAVAILABLE",
        "META_ERROR"
    ])("reconhece o motivo %s", (code) => {
        expect(whatsAppConnectionReasonOf(errorWith(code))).toBe(code)
    })

    it("devolve null para código desconhecido ou erro sem código", () => {
        expect(whatsAppConnectionReasonOf(errorWith("OUTRO"))).toBeNull()
        expect(whatsAppConnectionReasonOf(undefined)).toBeNull()
    })
})
