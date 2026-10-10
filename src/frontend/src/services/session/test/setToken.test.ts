import { afterEach, describe, expect, it } from "vitest"
import clearToken from "@/services/session/clearToken"
import getToken from "@/services/session/getToken"
import setToken from "@/services/session/setToken"

describe("setToken", () => {
    afterEach(() => {
        clearToken()
    })

    it("guarda o token em memória", () => {
        setToken("abc")

        expect(getToken()).toBe("abc")
    })

    it("não usa armazenamento persistente do navegador", () => {
        setToken("abc")

        expect(window.localStorage.length).toBe(0)
        expect(window.sessionStorage.length).toBe(0)
        expect(document.cookie).toBe("")
    })
})
