import { afterEach, describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import App from "@/App"
import { clearToken, setToken } from "@/services/session.service"

describe("App", () => {
    afterEach(() => {
        clearToken()
        window.history.pushState({}, "", "/")
    })

    it("renderiza o painel na rota raiz com sessão", async () => {
        setToken("abc")

        render(<App />)

        expect(await screen.findByRole("heading", { name: "Painel" })).toBeInTheDocument()
        expect(document.title).toBe("Painel - ProconChat")
    })

    it("usa o título e a meta description de NotFound.page numa rota desconhecida", async () => {
        window.history.pushState({}, "", "/rota-que-nao-existe")

        render(<App />)

        expect(await screen.findByRole("heading", { name: "404 - Not Found" })).toBeInTheDocument()
        expect(document.title).toBe("Página não encontrada.")
        expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toBe(
            "A página não existe ou você não possui acesso."
        )
    })
})
