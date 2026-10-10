import { describe, expect, it } from "vitest"
import clearToken from "@/services/session/clearToken"
import getToken from "@/services/session/getToken"
import setToken from "@/services/session/setToken"

describe("clearToken", () => {
    it("limpa o token em memória", () => {
        setToken("abc")

        clearToken()

        expect(getToken()).toBeNull()
    })
})
