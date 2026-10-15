import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import App from "@/App"

const LOAD_TIMEOUT_MS = 4000

const admin = {
    id: 1,
    name: "Ana Paula Souza",
    email: "ana@exemplo.gov.br",
    isAdmin: true,
    permissions: []
}

function stubMe() {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString()

        if (url.endsWith("/api/v1/auth/me")) {
            return new Response(JSON.stringify({ data: admin }), { status: 200 })
        }

        return new Response(null, { status: 404 })
    })
    vi.stubGlobal("fetch", fetchMock)
    return fetchMock
}

describe("App", { timeout: 15000 }, () => {
    beforeAll(async () => {
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
