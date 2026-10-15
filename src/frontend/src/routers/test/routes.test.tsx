import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import routes from "@/routers/routes"
import ROUTES from "@/routers/paths"
import renderWithStore from "@/testUtils/renderWithStore"
import type PanelAccount from "@/types/account/PanelAccount.types"
import type RootState from "@/types/store/RootState.types"

const admin: PanelAccount = {
    id: 1,
    name: "Ana Paula Souza",
    email: "ana@exemplo.gov.br",
    isAdmin: true,
    permissions: []
}

const withSession: Partial<RootState> = {
    account: { current: admin, status: "authenticated" }
}

const withoutSession: Partial<RootState> = {
    account: { current: null, status: "anonymous" }
}

function renderRoutes(initialEntries: string[], preloadedState?: Partial<RootState>) {
    const router = createMemoryRouter(routes, { initialEntries })
    const result = renderWithStore(<RouterProvider router={router} />, { preloadedState })

    return { ...result, router }
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
    beforeEach(() => {
        vi.stubGlobal(
            "fetch",
            vi.fn(() => new Promise<Response>(() => {}))
        )
    })

    afterEach(() => {
        vi.unstubAllGlobals()
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
        renderRoutes([path], withSession)

        expect(await screen.findByRole("heading", { name: title })).toBeInTheDocument()
        expect(screen.getByText("Em construção.")).toBeInTheDocument()
    })

    it.each(protectedRoutes)("leva %s sem sessão para a tela de entrada", async (path) => {
        const { router } = renderRoutes([path], withoutSession)

        expect(await screen.findByRole("heading", { name: "Entrar" })).toBeInTheDocument()
        expect(screen.queryByRole("navigation", { name: "Menu principal" })).not.toBeInTheDocument()
        expect(router.state.location.pathname).toBe(ROUTES.login)
        expect(router.state.location.search).toBe(`?redirect=${encodeURIComponent(path)}`)
    })

    it("leva uma rota inexistente sem sessão para a tela de entrada com o redirect", async () => {
        const { router } = renderRoutes(["/pao_mel_123"], withoutSession)

        expect(await screen.findByRole("heading", { name: "Entrar" })).toBeInTheDocument()
        expect(router.state.location.pathname).toBe(ROUTES.login)
        expect(router.state.location.search).toBe("?redirect=%2Fpao_mel_123")
    })

    it("trata /acesso-negado como rota inexistente, com e sem sessão", async () => {
        const anonymous = renderRoutes(["/acesso-negado"], withoutSession)
        expect(await screen.findByRole("heading", { name: "Entrar" })).toBeInTheDocument()
        expect(anonymous.router.state.location.search).toBe("?redirect=%2Facesso-negado")
        anonymous.unmount()

        renderRoutes(["/acesso-negado"], withSession)

        expect(await screen.findByRole("heading", { name: "404 - Not Found" })).toBeInTheDocument()
    })

    it("renderiza a página de NotFound em uma rota inexistente com sessão", async () => {
        renderRoutes(["/rota-que-nao-existe"], withSession)

        expect(await screen.findByRole("heading", { name: "404 - Not Found" })).toBeInTheDocument()
    })

    it("navega da NotFound para o painel ao clicar no link", async () => {
        const user = userEvent.setup()
        renderRoutes(["/rota-que-nao-existe"], withSession)

        await user.click(await screen.findByRole("link", { name: "Vá para a página inicial." }))

        expect(await screen.findByRole("heading", { name: "Painel" })).toBeInTheDocument()
    })
})
