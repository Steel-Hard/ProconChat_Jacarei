import type { ComponentType } from "react"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"

const LOAD_TIMEOUT_MS = 4000

let App: ComponentType

const admin = {
    id: 1,
    name: "Ana Paula Souza",
    email: "ana@exemplo.gov.br",
    isAdmin: true,
    permissions: []
}

function stubMe() {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
        const url = input instanceof Request ? input.url : input.toString()

        if (url.endsWith("/api/v1/auth/me")) {
            return new Response(JSON.stringify({ data: admin }), { status: 200 })
        }

        if (url.endsWith("/api/v1/appointments/pending-count")) {
            return new Response(JSON.stringify({ data: { count: 0 } }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            })
        }

        return new Response(null, { status: 404 })
    })
    vi.stubGlobal("fetch", fetchMock)
    return fetchMock
}

describe("App", { timeout: 15000 }, () => {
    beforeAll(async () => {
        vi.stubEnv("VITE_API_URL", "http://api.test")
        vi.resetModules()
        App = (await import("@/App")).default
        await import("@/pages/UnderConstruction.page")
        await import("@/pages/NotFound.page")
    })

    beforeEach(() => {
        stubMe()
    })

    afterEach(() => {
        window.history.pushState({}, "", "/")
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    afterAll(() => {
        vi.unstubAllEnvs()
    })

    it("renderiza o painel na rota raiz com sessão", async () => {
        render(<App />)

        expect(
            await screen.findByRole("heading", { name: "Painel" }, { timeout: LOAD_TIMEOUT_MS })
        ).toBeInTheDocument()
        expect(document.title).toBe("Painel - ProconChat")
    })

    it("usa o título e a meta description de NotFound.page numa rota desconhecida", async () => {
        window.history.pushState({}, "", "/rota-que-nao-existe")

        render(<App />)

        expect(
            await screen.findByRole(
                "heading",
                { name: "404 - Not Found" },
                { timeout: LOAD_TIMEOUT_MS }
            )
        ).toBeInTheDocument()
        expect(document.title).toBe("Página não encontrada.")
        expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toBe(
            "A página não existe ou você não possui acesso."
        )
    })

    it("renderiza dentro do Provider da store sem avisos no console", async () => {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined)

        render(<App />)

        expect(
            await screen.findByRole("heading", { name: "Painel" }, { timeout: LOAD_TIMEOUT_MS })
        ).toBeInTheDocument()
        expect(errorSpy).not.toHaveBeenCalled()
        expect(warnSpy).not.toHaveBeenCalled()
    })
})
