import { describe, expect, it } from "vitest"
import { MemoryRouter } from "react-router-dom"
import { render, screen } from "@testing-library/react"
import ForbiddenPage from "@/pages/Forbidden.page"

describe("ForbiddenPage", () => {
    it("renderiza o título de acesso negado", () => {
        render(
            <MemoryRouter>
                <ForbiddenPage />
            </MemoryRouter>
        )

        expect(screen.getByRole("heading", { name: "Acesso negado." })).toBeInTheDocument()
    })

    it("oferece um link para a tela de entrada", () => {
        render(
            <MemoryRouter>
                <ForbiddenPage />
            </MemoryRouter>
        )

        expect(screen.getByRole("link", { name: "Entrar no painel." })).toHaveAttribute(
            "href",
            "/login"
        )
    })

    it("define o title e a meta description da página", () => {
        render(
            <MemoryRouter>
                <ForbiddenPage />
            </MemoryRouter>
        )

        expect(document.title).toBe("Acesso negado.")
        expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toBe(
            "Você não tem sessão ativa ou permissão para acessar esta página."
        )
    })
})
