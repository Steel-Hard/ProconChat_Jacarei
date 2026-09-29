import { describe, expect, it, vi } from "vitest"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { render, screen } from "@testing-library/react"
import RequireAuth from "@/routers/RequireAuth"
import { useAuth } from "@/hooks/useAuth"
import { ROUTES } from "@/routers/paths"

vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }))

function renderWithAuth() {
    const router = createMemoryRouter(
        [
            {
                element: <RequireAuth />,
                children: [{ path: ROUTES.protectedExample, element: <p>Conteúdo protegido</p> }]
            },
            { path: ROUTES.forbidden, element: <p>Bloqueado</p> }
        ],
        { initialEntries: [ROUTES.protectedExample] }
    )

    return render(<RouterProvider router={router} />)
}

describe("RequireAuth", () => {
    it("redireciona para a rota de bloqueio quando não autenticado", async () => {
        vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false })

        renderWithAuth()

        expect(await screen.findByText("Bloqueado")).toBeInTheDocument()
        expect(screen.queryByText("Conteúdo protegido")).not.toBeInTheDocument()
    })

    it("renderiza o conteúdo protegido quando autenticado", () => {
        vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true })

        renderWithAuth()

        expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument()
    })
})
