import { describe, expect, it } from "vitest"
import createStore from "@/store/createStore"
import accountSlice from "@/store/slices/account.slice"
import type PanelAccount from "@/types/account/PanelAccount.types"

const account: PanelAccount = {
    id: 7,
    name: "Ana Paula Souza",
    email: "ana@exemplo.gov.br",
    isAdmin: false,
    permissions: ["sessions.view"]
}

describe("accountSlice", () => {
    it("começa sem conta e com a sessão desconhecida", () => {
        expect(accountSlice.reducer(undefined, { type: "init" })).toEqual({
            current: null,
            status: "unknown"
        })
    })

    it("guarda a conta carregada", () => {
        const state = accountSlice.reducer(
            { current: null, status: "unknown" },
            accountSlice.actions.accountLoaded(account)
        )

        expect(state.current).toEqual(account)
    })

    it("limpa a conta", () => {
        const state = accountSlice.reducer(
            { current: account, status: "authenticated" },
            accountSlice.actions.accountCleared()
        )

        expect(state.current).toBeNull()
    })

    it("marca a sessão como autenticada ao carregar a conta", () => {
        const state = accountSlice.reducer(
            { current: null, status: "anonymous" },
            accountSlice.actions.accountLoaded(account)
        )

        expect(state).toEqual({ current: account, status: "authenticated" })
    })

    it("marca a sessão como anônima ao limpar a conta", () => {
        const state = accountSlice.reducer(
            { current: null, status: "unknown" },
            accountSlice.actions.accountCleared()
        )

        expect(state).toEqual({ current: null, status: "anonymous" })
    })

    it("guarda a conta só em memória, sem usar armazenamento do navegador", () => {
        const store = createStore()

        store.dispatch(accountSlice.actions.accountLoaded(account))

        expect(store.getState().account.current).toEqual(account)
        expect(window.localStorage.length).toBe(0)
        expect(window.sessionStorage.length).toBe(0)
        expect(document.cookie).toBe("")
    })
})
