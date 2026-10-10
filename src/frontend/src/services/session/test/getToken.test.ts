import { describe, expect, it } from "vitest"
import getToken from "@/services/session/getToken"

describe("getToken", () => {
    it("começa sem token", () => {
        expect(getToken()).toBeNull()
    })
})
