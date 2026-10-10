import { afterEach, describe, expect, it, vi } from "vitest"
import { clearAccount, getAccount, setAccount, subscribe } from "@/services/account.service"
import type { PanelAccount } from "@/types/account"

const account: PanelAccount = {
    name: "Ana Paula Souza",
    email: "ana@exemplo.gov.br",
    isAdmin: false,
    permissions: ["sessions.view"]
}

describe("account.service", () => {
    afterEach(() => {
        clearAccount()
    })

    it("começa sem conta", () => {
        expect(getAccount()).toBeNull()
    })

    it("guarda a conta em memória sem usar armazenamento do navegador", () => {
        setAccount(account)

        expect(getAccount()).toEqual(account)
        expect(window.localStorage.length).toBe(0)
        expect(window.sessionStorage.length).toBe(0)
    })

    it("limpa a conta", () => {
        setAccount(account)

        clearAccount()

        expect(getAccount()).toBeNull()
    })

    it("notifica os assinantes a cada mudança até cancelar a assinatura", () => {
        const listener = vi.fn()
        const unsubscribe = subscribe(listener)

        setAccount(account)
        clearAccount()
        expect(listener).toHaveBeenCalledTimes(2)

        unsubscribe()
        setAccount(account)
        expect(listener).toHaveBeenCalledTimes(2)
    })
})
