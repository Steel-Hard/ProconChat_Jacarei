import { describe, expect, it } from "vitest"
import accountSlice from "@/store/slices/account.slice"
import type { PanelAccount } from "@/types/account"

const account: PanelAccount = {
    name: "Ana Paula Souza",
    email: "ana@exemplo.gov.br",
    isAdmin: false,
    permissions: ["sessions.view"]
}

describe("accountSlice", () => {
    it("começa sem conta", () => {
        expect(accountSlice.reducer(undefined, { type: "init" })).toEqual({ current: null })
    })

    it("guarda a conta carregada", () => {
        const state = accountSlice.reducer(
            { current: null },
            accountSlice.actions.accountLoaded(account)
        )

        expect(state.current).toEqual(account)
    })

    it("limpa a conta", () => {
        const state = accountSlice.reducer(
            { current: account },
            accountSlice.actions.accountCleared()
        )

        expect(state.current).toBeNull()
    })
})
