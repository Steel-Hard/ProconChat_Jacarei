import { afterEach, describe, expect, it, vi } from "vitest"
import { act, screen } from "@testing-library/react"
import { createMemoryRouter, RouterProvider, useLocation } from "react-router-dom"
import RequireAuth from "@/routers/RequireAuth"
import ROUTES from "@/routers/paths"
import authHandlers from "@/services/http/authHandlers"
import renderWithStore from "@/testUtils/renderWithStore"
import type AccountStatus from "@/types/account/AccountStatus.types"

const account = {
    id: 1,
    name: "Ana Paula Souza",
    email: "ana@exemplo.gov.br",
    isAdmin: true,
    permissions: []
}

function LoginProbe() {
    const location = useLocation()

    return <p>{`Login em ${location.pathname}${location.search}`}</p>
}

function renderWithAuth(status: AccountStatus, initialEntry: string = ROUTES.appointments) {
    const fetchMock = vi.fn(() => new Promise<Response>(() => {}))
    vi.stubGlobal("fetch", fetchMock)
    const router = createMemoryRouter(
        [
            {
                element: <RequireAuth />,
                children: [
                    { path: ROUTES.appointments, element: <p>Conteúdo protegido</p> },
                    { path: ROUTES.sessions, element: <p>Sessões protegidas</p> }
                ]
            },
            { path: ROUTES.login, element: <LoginProbe /> }
        ],
        { initialEntries: [initialEntry] }
    )
    const result = renderWithStore(<RouterProvider router={router} />, {
        preloadedState: {
            account: { current: status === "authenticated" ? account : null, status }
        }
    })

    return { ...result, router, fetchMock }
}

describe("RequireAuth", () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it("redireciona ao login com a rota pedida quando a sessão é anônima", async () => {
        renderWithAuth("anonymous")

        expect(
            await screen.findByText("Login em /login?redirect=%2Fagendamentos")
        ).toBeInTheDocument()
        expect(screen.queryByText("Conteúdo protegido")).not.toBeInTheDocument()
    })

    it("preserva a query no redirect e não chama /me quando a sessão é anônima", async () => {
        const { fetchMock, router } = renderWithAuth("anonymous", "/sessoes?pagina=2")

        await screen.findByText(/^Login em/)

        expect(router.state.location.search).toBe(
            `?redirect=${encodeURIComponent("/sessoes?pagina=2")}`
        )
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it("renderiza o conteúdo protegido sem chamar /me quando autenticado", () => {
        const { fetchMock } = renderWithAuth("authenticated")

        expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument()
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it("mostra o carregamento enquanto a sessão é desconhecida", () => {
        const { fetchMock } = renderWithAuth("unknown")

        expect(screen.getByText("Carregando...")).toBeInTheDocument()
        expect(screen.queryByText("Conteúdo protegido")).not.toBeInTheDocument()
        expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it("vai ao login com a rota atual quando a sessão cai durante o uso", async () => {
        const { router, store } = renderWithAuth("authenticated", ROUTES.sessions)
        expect(screen.getByText("Sessões protegidas")).toBeInTheDocument()

        act(() => authHandlers.unauthorizedHandler?.())

        expect(await screen.findByText("Login em /login?redirect=%2Fsessoes")).toBeInTheDocument()
        expect(router.state.location.pathname).toBe(ROUTES.login)
        expect(store.getState().account.status).toBe("anonymous")
    })
})
