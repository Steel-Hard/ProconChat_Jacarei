import { afterEach, describe, expect, it, vi } from "vitest"
import createStore from "@/store/createStore"

afterEach(() => {
    vi.restoreAllMocks()
})

describe("createStore", () => {
    it("registra o reducer da api na chave api", () => {
        const store = createStore()

        expect(store.getState()).toHaveProperty("api")
        expect(store.getState()).toHaveProperty("account", { current: null })
    })

    it("devolve uma store nova a cada chamada", () => {
        expect(createStore()).not.toBe(createStore())
    })

    it("não emite aviso do Redux ao despachar uma action", () => {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined)
        const store = createStore()

        store.dispatch({ type: "test/action" })

        expect(errorSpy).not.toHaveBeenCalled()
        expect(warnSpy).not.toHaveBeenCalled()
    })
})
