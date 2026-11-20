import { describe, expect, it } from "vitest"
import apiErrorCodeOf from "@/utils/apiErrorCodeOf"

describe("apiErrorCodeOf", () => {
    it("lê o código do corpo de erro da API", () => {
        expect(apiErrorCodeOf({ status: 422, data: { error: { code: "INVALID_TOKEN" } } })).toBe(
            "INVALID_TOKEN"
        )
    })

    it.each([
        undefined,
        null,
        "erro",
        {},
        { data: null },
        { data: {} },
        { data: { error: null } },
        { data: { error: {} } },
        { data: { error: { code: 42 } } }
    ])("devolve null quando não há código textual (%j)", (error) => {
        expect(apiErrorCodeOf(error)).toBeNull()
    })
})
