import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import App from "@/App"

describe("App", () => {
    it("renderiza a página inicial na rota raiz", async () => {
        render(<App />)

        expect(await screen.findByRole("heading", { name: "Hello World!" })).toBeInTheDocument()
    })

    it("define título e meta description da página no head", async () => {
        render(<App />)

        expect(await screen.findByRole("heading", { name: "Hello World!" })).toBeInTheDocument()
        expect(document.title).toBe("Título da Página")
        expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toBe(
            "Minha descrição personalizada."
        )
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
