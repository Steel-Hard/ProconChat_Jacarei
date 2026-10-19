import { describe, expect, it } from "vitest"
import { MemoryRouter } from "react-router-dom"
import { render, screen } from "@testing-library/react"
import NotFoundPage from "@/pages/NotFound.page"

describe("NotFoundPage", () => {
    it("renderiza o título de página não encontrada", () => {
        render(
            <MemoryRouter>
                <NotFoundPage />
            </MemoryRouter>
        )

        expect(screen.getByRole("heading", { name: "404 - Not Found" })).toBeInTheDocument()
    })

    it("oferece um link de volta para a página inicial", () => {
        render(
            <MemoryRouter>
                <NotFoundPage />
            </MemoryRouter>
        )

        expect(screen.getByRole("link", { name: "Vá para a página inicial." })).toHaveAttribute(
            "href",
            "/"
        )
    })

    it("não aplica atributo class no heading", () => {
        render(
            <MemoryRouter>
                <NotFoundPage />
            </MemoryRouter>
        )

        expect(screen.getByRole("heading", { name: "404 - Not Found" })).not.toHaveAttribute(
            "class"
        )
    })

    it("define o title e a meta description da página", () => {
        render(
            <MemoryRouter>
                <NotFoundPage />
            </MemoryRouter>
        )

        expect(document.title).toBe("Página não encontrada.")
        expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toBe(
            "A página não existe ou você não possui acesso."
        )
    })
})
