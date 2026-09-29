import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes as Switch } from "react-router-dom"
import HomePage from "@/pages/Home.page"

function renderHomePage() {
    return render(
        <MemoryRouter initialEntries={["/"]}>
            <Switch>
                <Route path="/" element={<HomePage />} />
                <Route path="/exemplos" element={<p>Página de exemplos</p>} />
            </Switch>
        </MemoryRouter>
    )
}

describe("HomePage", () => {
    it("renderiza o título principal", () => {
        renderHomePage()

        expect(screen.getByRole("heading", { name: "Hello World!" })).toBeInTheDocument()
    })

    it("define título e meta description da página no head", () => {
        renderHomePage()

        expect(document.title).toBe("Título da Página")
        expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toBe(
            "Minha descrição personalizada."
        )
    })

    it("renderiza a vitrine de tokens de design", () => {
        renderHomePage()

        expect(screen.getByText("Rótulo de exemplo")).toBeInTheDocument()
        expect(screen.getByText("destaque")).toBeInTheDocument()
        expect(
            screen.getByText("Legenda de exemplo em texto secundário, para conteúdo complementar.")
        ).toBeInTheDocument()
        expect(screen.getByText("Sucesso")).toBeInTheDocument()
        expect(screen.getByText("Aviso")).toBeInTheDocument()
        expect(screen.getByText("Erro")).toBeInTheDocument()
    })

    it("navega para a página de exemplos ao clicar no botão", () => {
        renderHomePage()

        userEvent.click(screen.getByRole("button", { name: "Ver exemplos integrados" }))

        expect(screen.getByText("Página de exemplos")).toBeInTheDocument()
    })
})
