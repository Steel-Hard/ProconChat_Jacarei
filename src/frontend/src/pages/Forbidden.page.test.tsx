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

    it("oferece um link de volta para a página inicial", () => {
        render(
            <MemoryRouter>
                <ForbiddenPage />
            </MemoryRouter>
        )

        expect(screen.getByRole("link", { name: "Vá para a página inicial." })).toHaveAttribute(
            "href",
            "/"
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
            "Você não tem permissão para acessar esta página."
        )
    })
})
