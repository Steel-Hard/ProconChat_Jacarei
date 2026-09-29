import { describe, expect, it } from "vitest"
import { MemoryRouter, Route, Routes as Switch } from "react-router-dom"
import { render, screen } from "@testing-library/react"
import MainLayout from "@/layouts/Main.layout"

function renderLayout() {
    render(
        <MemoryRouter initialEntries={["/"]}>
            <Switch>
                <Route element={<MainLayout />}>
                    <Route path="/" element={<p>Conteúdo da rota</p>} />
                </Route>
            </Switch>
        </MemoryRouter>
    )
}

describe("MainLayout", () => {
    it("renderiza o header e o footer", () => {
        renderLayout()

        expect(screen.getByRole("banner")).toHaveTextContent("Header de exemplo")
        expect(screen.getByRole("contentinfo")).toHaveTextContent("Footer de exemplo")
    })

    it("renderiza a rota filha no lugar do Outlet", () => {
        renderLayout()

        expect(screen.getByText("Conteúdo da rota")).toBeInTheDocument()
    })
})
