import { afterEach, describe, expect, it, vi } from "vitest"
import { isValidInternalToken } from "./internalToken"

describe("isValidInternalToken", () => {
    afterEach(() => {
        vi.unstubAllEnvs()
    })

    it("aceita o token igual ao configurado", () => {
        expect(isValidInternalToken("test-only-internal-token")).toBe(true)
    })

    it.each([
        ["ausente", undefined],
        ["vazio", ""],
        ["de outro tamanho", "curto"],
        ["diferente com o mesmo tamanho", "test-only-internal-tokeX"],
    ])("recusa o token %s", (_label, header) => {
        expect(isValidInternalToken(header)).toBe(false)
    })

    it.each([undefined, ""])("recusa qualquer token quando o token interno configurado e %s", (configured) => {
        vi.stubEnv("GATEWAY_INTERNAL_TOKEN", configured)

        expect(isValidInternalToken("")).toBe(false)
        expect(isValidInternalToken("test-only-internal-token")).toBe(false)
    })
})
