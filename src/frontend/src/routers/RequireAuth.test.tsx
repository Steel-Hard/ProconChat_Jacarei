import { afterEach, describe, expect, it } from "vitest"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { render, screen } from "@testing-library/react"
import RequireAuth from "@/routers/RequireAuth"
import { ROUTES } from "@/routers/paths"
import { clearToken, setToken } from "@/services/session.service"

function renderWithAuth() {
    const router = createMemoryRouter(
        [
            {
                element: <RequireAuth />,
                children: [{ path: ROUTES.appointments, element: <p>Conteúdo protegido</p> }]
            },
            { path: ROUTES.forbidden, element: <p>Bloqueado</p> }
        ],
        { initialEntries: [ROUTES.appointments] }
    )

    return render(<RouterProvider router={router} />)
}

describe("RequireAuth", () => {
    afterEach(() => {
        clearToken()
    })

    it("redireciona para a rota de bloqueio quando não autenticado", async () => {
        renderWithAuth()

        expect(await screen.findByText("Bloqueado")).toBeInTheDocument()
        expect(screen.queryByText("Conteúdo protegido")).not.toBeInTheDocument()
    })

    it("renderiza o conteúdo protegido quando autenticado", () => {
        setToken("abc")

        renderWithAuth()

        expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument()
    })
})
