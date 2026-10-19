import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import routes from "@/routers/routes"
import ROUTES from "@/routers/paths"
import renderWithStore from "@/testUtils/renderWithStore"
import PERMISSION_KEYS from "@/navigation/permissionKeys"
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

const staffWithAllPermissions: PanelAccount = {
    id: 2,
    name: "Bruno Lima",
    email: "bruno@exemplo.gov.br",
    isAdmin: false,
    permissions: [...PERMISSION_KEYS]
}

const withStaffSession: Partial<RootState> = {
    account: { current: staffWithAllPermissions, status: "authenticated" }
}

const withoutSession: Partial<RootState> = {
    account: { current: null, status: "anonymous" }
}

function renderRoutes(initialEntries: string[], preloadedState?: Partial<RootState>) {
    const router = createMemoryRouter(routes, { initialEntries })
    const result = renderWithStore(<RouterProvider router={router} />, { preloadedState })

    return { ...result, router }
}

const underConstructionRoutes: Array<[string, string]> = [
    [ROUTES.dashboard, "Painel"],
    ["/agendamentos/1", "Detalhe do agendamento"],
    [ROUTES.reports, "Relatórios"],
    [ROUTES.content, "Conteúdo"],
    [ROUTES.sessions, "Sessões"],
    [ROUTES.schedule, "Horários"],
    [ROUTES.documents, "Documentos"],
    [ROUTES.users, "Usuários"]
]

const protectedRoutes: Array<[string, string]> = [
    ...underConstructionRoutes,
    [ROUTES.appointments, "Agendamentos"],
    [ROUTES.whatsapp, "WhatsApp"]
]

async function renderWithApiUrl(initialEntries: string[], preloadedState: Partial<RootState>) {
    vi.stubEnv("VITE_API_URL", "http://api.test")
    vi.resetModules()
    const { default: freshRoutes } = await import("@/routers/routes")
    const { default: freshRenderWithStore } = await import("@/testUtils/renderWithStore")
    const router = createMemoryRouter(freshRoutes, { initialEntries })

    return freshRenderWithStore(<RouterProvider router={router} />, { preloadedState })
}

function requestedUrls(): string[] {
    const fetchMock = vi.mocked(fetch)

    return fetchMock.mock.calls.map(([input]) =>
        input instanceof Request ? input.url : String(input)
    )
}

describe("routes", () => {
    beforeEach(() => {
        vi.stubGlobal(
            "fetch",
            vi.fn(() => new Promise<Response>(() => {}))
        )
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        vi.unstubAllEnvs()
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

    it.each(underConstructionRoutes)("renderiza %s com sessão", async (path, title) => {
        renderRoutes([path], withSession)

        expect(await screen.findByRole("heading", { name: title })).toBeInTheDocument()
        expect(screen.getByText("Em construção.")).toBeInTheDocument()
    })

    it("renderiza a tela de WhatsApp para o Admin, carregando a configuração", async () => {
        await renderWithApiUrl([ROUTES.whatsapp], withSession)

        expect(await screen.findByRole("heading", { name: "WhatsApp" })).toBeInTheDocument()
        expect(screen.getByText("Carregando...")).toBeInTheDocument()
        expect(screen.queryByText("Em construção.")).not.toBeInTheDocument()
        await waitFor(() =>
            expect(requestedUrls().some((url) => url.endsWith("/api/v1/whatsapp/settings"))).toBe(
                true
            )
        )
    })

    it("renderiza a tela de Agendamentos com sessão, pedindo a lista e o contador", async () => {
        await renderWithApiUrl([ROUTES.appointments], withSession)

        expect(await screen.findByRole("heading", { name: "Agendamentos" })).toBeInTheDocument()
        expect(screen.queryByText("Em construção.")).not.toBeInTheDocument()
        expect(screen.getByRole("searchbox", { name: "Buscar" })).toBeInTheDocument()
        await waitFor(() =>
            expect(requestedUrls().some((url) => url.includes("/api/v1/appointments?"))).toBe(true)
        )
        expect(
            requestedUrls().some((url) => url.endsWith("/api/v1/appointments/pending-count"))
        ).toBe(true)
    })

    it("mostra a NotFound ao funcionário com todas as permissões em /whatsapp sem chamar a API do WhatsApp", async () => {
        await renderWithApiUrl([ROUTES.whatsapp], withStaffSession)

        expect(await screen.findByRole("heading", { name: "404 - Not Found" })).toBeInTheDocument()
        expect(screen.queryByRole("heading", { name: "WhatsApp" })).not.toBeInTheDocument()
        expect(requestedUrls().some((url) => url.includes("/whatsapp/settings"))).toBe(false)
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
