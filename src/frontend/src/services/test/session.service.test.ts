import { afterEach, describe, expect, it, vi } from "vitest"
import { clearToken, getToken, setToken, subscribe } from "@/services/session.service"

describe("session.service", () => {
    afterEach(() => {
        clearToken()
    })

    it("começa sem token", () => {
        expect(getToken()).toBeNull()
    })

    it("guarda e limpa o token em memória", () => {
        setToken("abc")
        expect(getToken()).toBe("abc")

        clearToken()
        expect(getToken()).toBeNull()
    })

    it("não usa armazenamento persistente do navegador", () => {
        setToken("abc")

        expect(window.localStorage.length).toBe(0)
        expect(window.sessionStorage.length).toBe(0)
        expect(document.cookie).toBe("")
    })

    it("notifica os assinantes a cada mudança até cancelar a assinatura", () => {
        const listener = vi.fn()
        const unsubscribe = subscribe(listener)

        setToken("abc")
        clearToken()
        expect(listener).toHaveBeenCalledTimes(2)

        unsubscribe()
        setToken("def")
        expect(listener).toHaveBeenCalledTimes(2)
    })
})
