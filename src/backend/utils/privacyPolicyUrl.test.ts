import { describe, expect, it } from "vitest"
import { privacyPolicyUrlFrom } from "./privacyPolicyUrl"

describe("privacyPolicyUrlFrom", () => {
    it.each([undefined, ""])("devolve null com a base %j", (base) => {
        expect(privacyPolicyUrlFrom(base)).toBeNull()
    })

    it.each(["https://exemplo.sslip.io", "https://exemplo.sslip.io/"])("monta o link sem barra dupla a partir de %s", (base) => {
        expect(privacyPolicyUrlFrom(base)).toBe("https://exemplo.sslip.io/privacidade")
    })
})
