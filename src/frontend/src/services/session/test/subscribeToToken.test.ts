import { afterEach, describe, expect, it, vi } from "vitest"
import clearToken from "@/services/session/clearToken"
import setToken from "@/services/session/setToken"
import subscribeToToken from "@/services/session/subscribeToToken"

describe("subscribeToToken", () => {
    afterEach(() => {
        clearToken()
    })

    it("notifica os assinantes a cada mudança até cancelar a assinatura", () => {
        const listener = vi.fn()
        const unsubscribe = subscribeToToken(listener)

        setToken("abc")
        clearToken()
        expect(listener).toHaveBeenCalledTimes(2)

        unsubscribe()
        setToken("def")
        expect(listener).toHaveBeenCalledTimes(2)
    })
})
