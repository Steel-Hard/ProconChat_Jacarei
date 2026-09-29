import { describe, expect, it, vi } from "vitest"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { routes } from "@/routers/Router"
import { ROUTES } from "@/routers/paths"
import { get } from "@/services/http.service"
import type { ExampleEntity } from "@/types/example.types"

vi.mock("@/services/http.service", () => ({ get: vi.fn() }))

function renderRoutes(initialEntries: string[]) {
    const router = createMemoryRouter(routes, { initialEntries })
    return render(<RouterProvider router={router} />)
}

describe("routes", () => {
    it("mostra o fallback de carregamento antes da página lazy resolver", () => {
        renderRoutes(["/"])

        expect(screen.getByText("Carregando...")).toBeInTheDocument()
    })

    it("renderiza o header e o footer do MainLayout ao redor da página em uma rota válida", async () => {
        renderRoutes(["/"])

        expect(await screen.findByRole("heading", { name: "Hello World!" })).toBeInTheDocument()
        expect(screen.getByRole("banner")).toBeInTheDocument()
        expect(screen.getByRole("contentinfo")).toBeInTheDocument()
    })

    it("renderiza a página de NotFound em uma rota inexistente", async () => {
        renderRoutes(["/rota-que-nao-existe"])

        expect(await screen.findByRole("heading", { name: "404 - Not Found" })).toBeInTheDocument()
    })

    it("navega da NotFound para a Home ao clicar no link, sem full reload", async () => {
        renderRoutes(["/rota-que-nao-existe"])

        await screen.findByRole("link", { name: "Vá para a página inicial." })
        userEvent.click(screen.getByRole("link", { name: "Vá para a página inicial." }))

        expect(await screen.findByRole("heading", { name: "Hello World!" })).toBeInTheDocument()
    })

    it("redireciona para a página de acesso negado ao acessar a rota protegida sem autenticação", async () => {
        renderRoutes([ROUTES.protectedExample])

        expect(await screen.findByRole("heading", { name: "Acesso negado." })).toBeInTheDocument()
        expect(
            screen.queryByText("Você só vê isso se estiver autenticado.")
        ).not.toBeInTheDocument()
    })

    it("renderiza a página de exemplos integrados dentro do MainLayout na rota /exemplos", async () => {
        const entities: ExampleEntity[] = [
            { id: "1", name: "Exemplo um", active: true, createdAt: "2026-01-10T12:00:00.000Z" }
        ]
        vi.mocked(get).mockResolvedValue(entities)

        renderRoutes([ROUTES.examples])

        expect(
            await screen.findByRole("heading", { name: "Exemplos integrados" })
        ).toBeInTheDocument()
        expect(await screen.findByText("Exemplo um")).toBeInTheDocument()
        expect(screen.getByRole("banner")).toBeInTheDocument()
        expect(screen.getByRole("contentinfo")).toBeInTheDocument()
    })
})
