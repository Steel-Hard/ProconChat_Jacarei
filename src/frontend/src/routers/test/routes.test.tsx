import { afterEach, describe, expect, it, vi } from "vitest"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import routes from "@/routers/routes"
import ROUTES from "@/routers/paths"
import renderWithStore from "@/testUtils/renderWithStore"
import clearToken from "@/services/session/clearToken"
import setToken from "@/services/session/setToken"

function renderRoutes(initialEntries: string[]) {
    const router = createMemoryRouter(routes, { initialEntries })
    return renderWithStore(<RouterProvider router={router} />)
}

const protectedRoutes: Array<[string, string]> = [
    [ROUTES.dashboard, "Painel"],
    [ROUTES.appointments, "Agendamentos"],
    ["/agendamentos/1", "Detalhe do agendamento"],
    [ROUTES.reports, "Relatórios"],
    [ROUTES.content, "Conteúdo"],
    [ROUTES.sessions, "Sessões"],
    [ROUTES.schedule, "Horários"],
    [ROUTES.documents, "Documentos"],
    [ROUTES.users, "Usuários"],
    [ROUTES.whatsapp, "WhatsApp"]
]

describe("routes", () => {
    afterEach(() => {
        clearToken()
    })

    it("mostra o fallback de carregamento antes da página lazy resolver", async () => {
        vi.resetModules()
        const { default: freshRoutes } = await import("@/routers/routes")
        const { default: freshRenderWithStore } = await import("@/testUtils/renderWithStore")
        const router = createMemoryRouter(freshRoutes, { initialEntries: [ROUTES.login] })

        freshRenderWithStore(<RouterProvider router={router} />)

        expect(screen.getByText("Carregando...")).toBeInTheDocument()
    })

    it("renderiza a tela de entrada sem sessão", async () => {
        renderRoutes([ROUTES.login])

        expect(await screen.findByRole("heading", { name: "Entrar" })).toBeInTheDocument()
    })

    it.each(protectedRoutes)("renderiza %s com sessão", async (path, title) => {
        setToken("abc")

        renderRoutes([path])

        expect(await screen.findByRole("heading", { name: title })).toBeInTheDocument()
        expect(screen.getByText("Em construção.")).toBeInTheDocument()
    })

    it.each(protectedRoutes)("redireciona %s sem sessão para o acesso negado", async (path) => {
        renderRoutes([path])

        expect(await screen.findByRole("heading", { name: "Acesso negado." })).toBeInTheDocument()
    })

    it("renderiza a página de NotFound em uma rota inexistente", async () => {
        renderRoutes(["/rota-que-nao-existe"])

        expect(await screen.findByRole("heading", { name: "404 - Not Found" })).toBeInTheDocument()
    })

    it("navega da NotFound para o painel ao clicar no link", async () => {
        const user = userEvent.setup()
        setToken("abc")
        renderRoutes(["/rota-que-nao-existe"])

        await user.click(await screen.findByRole("link", { name: "Vá para a página inicial." }))

        expect(await screen.findByRole("heading", { name: "Painel" })).toBeInTheDocument()
    })

    it("leva da página de acesso negado para a tela de entrada", async () => {
        const user = userEvent.setup()
        renderRoutes([ROUTES.forbidden])

        await user.click(await screen.findByRole("link", { name: "Entrar no painel." }))

        expect(await screen.findByRole("heading", { name: "Entrar" })).toBeInTheDocument()
    })
})
