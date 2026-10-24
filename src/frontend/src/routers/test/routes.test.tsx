import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import ROUTES from "@/routers/paths"
import loadPanelRoutes from "@/testUtils/loadPanelRoutes"
import PERMISSION_KEYS from "@/navigation/permissionKeys"
import type PanelAccount from "@/types/account/PanelAccount.types"
import type PermissionKey from "@/types/account/PermissionKey.types"
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

let panel: Awaited<ReturnType<typeof loadPanelRoutes>>

function renderRoutes(initialEntries: string[], preloadedState?: Partial<RootState>) {
    const router = createMemoryRouter(panel.routes, { initialEntries })
    const result = panel.renderWithStore(<RouterProvider router={router} />, { preloadedState })

    return { ...result, router }
}

const underConstructionRoutes: Array<[string, string]> = [
    [ROUTES.reports, "Relatórios"],
    [ROUTES.content, "Conteúdo"],
    [ROUTES.sessions, "Sessões"],
    [ROUTES.documents, "Documentos"]
]

const protectedRoutes: Array<[string, string]> = [
    [ROUTES.dashboard, "Painel"],
    ...underConstructionRoutes,
    [ROUTES.appointments, "Agendamentos"],
    ["/agendamentos/1", "Detalhe do agendamento"],
    [ROUTES.schedule, "Horários de atendimento"],
    [ROUTES.users, "Usuários"],
    [ROUTES.whatsapp, "WhatsApp"]
]

function requestedUrls(): string[] {
    const fetchMock = vi.mocked(fetch)

    return fetchMock.mock.calls.map(([input]) =>
        input instanceof Request ? input.url : String(input)
    )
}

const NO_ACCESS_HEADING = "Sua conta ainda não tem acesso a nenhuma tela"

function staffWith(permissions: PermissionKey[]): PanelAccount {
    return { ...staffWithAllPermissions, permissions }
}

function stubFetchByUrl(respond: (url: string) => Response) {
    vi.stubGlobal(
        "fetch",
        vi.fn((input: RequestInfo | URL) =>
            Promise.resolve(respond(input instanceof Request ? input.url : String(input)))
        )
    )
}

function stubLoginAs(permissions: PermissionKey[]) {
    stubFetchByUrl((url) =>
        url.endsWith("/api/v1/auth/login")
            ? new Response(JSON.stringify({ data: { user: staffWith(permissions) } }), {
                  status: 200
              })
            : new Response(null, { status: 204 })
    )
}

async function submitLogin(user: ReturnType<typeof userEvent.setup>) {
    await user.type(await screen.findByRole("textbox", { name: "E-mail" }), "bruno@exemplo.gov.br")
    await user.type(screen.getByLabelText("Senha"), "senha-segura")
    await user.click(screen.getByRole("button", { name: "Entrar" }))
}

function stubNeverAnsweringFetch() {
    vi.stubGlobal(
        "fetch",
        vi.fn(() => new Promise<Response>(() => {}))
    )
}

describe("routes antes de carregar as páginas", () => {
    beforeEach(stubNeverAnsweringFetch)

    afterEach(() => {
        vi.unstubAllGlobals()
        vi.unstubAllEnvs()
    })

    it("mostra o fallback de carregamento antes da página lazy resolver", async () => {
        const fresh = await loadPanelRoutes()
        const router = createMemoryRouter(fresh.routes, { initialEntries: [ROUTES.login] })

        fresh.renderWithStore(<RouterProvider router={router} />)

        expect(screen.getByText("Carregando...")).toBeInTheDocument()
    })
})

describe("routes", () => {
    beforeAll(async () => {
        panel = await loadPanelRoutes([
            () => import("@/pages/Login.page"),
            () => import("@/pages/NotFound.page"),
            () => import("@/pages/UnderConstruction.page"),
            () => import("@/pages/WhatsApp.page"),
            () => import("@/pages/Appointments.page"),
            () => import("@/pages/AppointmentDetail.page"),
            () => import("@/pages/Users.page"),
            () => import("@/pages/Schedule.page")
        ])
    })

    beforeEach(stubNeverAnsweringFetch)

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    afterAll(() => {
        vi.unstubAllEnvs()
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
        renderRoutes([ROUTES.whatsapp], withSession)

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
        renderRoutes([ROUTES.appointments], withSession)

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

    it("renderiza a tela de Usuários para o Admin, carregando as contas", async () => {
        renderRoutes([ROUTES.users], withSession)

        expect(await screen.findByRole("heading", { name: "Usuários" })).toBeInTheDocument()
        expect(screen.getByText("Carregando...")).toBeInTheDocument()
        expect(screen.queryByText("Em construção.")).not.toBeInTheDocument()
        await waitFor(() =>
            expect(requestedUrls().some((url) => url.endsWith("/api/v1/users"))).toBe(true)
        )
    })

    it("renderiza a tela de Usuários para quem gerencia usuários", async () => {
        renderRoutes([ROUTES.users], {
            account: {
                current: { ...staffWithAllPermissions, permissions: ["users.manage"] },
                status: "authenticated"
            }
        })

        expect(await screen.findByRole("heading", { name: "Usuários" })).toBeInTheDocument()
        expect(screen.queryByText("Em construção.")).not.toBeInTheDocument()
    })

    it("renderiza a tela de Horários de atendimento para o Admin, carregando a configuração", async () => {
        renderRoutes([ROUTES.schedule], withSession)

        expect(
            await screen.findByRole("heading", { name: "Horários de atendimento", level: 1 })
        ).toBeInTheDocument()
        expect(screen.getByText("Carregando...")).toBeInTheDocument()
        expect(screen.queryByText("Em construção.")).not.toBeInTheDocument()
        await waitFor(() =>
            expect(requestedUrls().some((url) => url.endsWith("/api/v1/schedule"))).toBe(true)
        )
    })

    it("renderiza a tela de Horários de atendimento para quem configura o atendimento", async () => {
        renderRoutes([ROUTES.schedule], {
            account: {
                current: { ...staffWithAllPermissions, permissions: ["schedule.configure"] },
                status: "authenticated"
            }
        })

        expect(
            await screen.findByRole("heading", { name: "Horários de atendimento", level: 1 })
        ).toBeInTheDocument()
        expect(screen.getByRole("link", { name: "Horários de atendimento" })).toBeInTheDocument()
    })

    it("mostra a NotFound em /horarios a quem não configura o atendimento, sem chamar a API de horários", async () => {
        renderRoutes([ROUTES.schedule], {
            account: {
                current: { ...staffWithAllPermissions, permissions: ["users.manage"] },
                status: "authenticated"
            }
        })

        expect(await screen.findByRole("heading", { name: "404 - Not Found" })).toBeInTheDocument()
        expect(requestedUrls().some((url) => url.includes("/api/v1/schedule"))).toBe(false)
    })

    it("renderiza o detalhe do agendamento com sessão, pedindo o agendamento pelo id", async () => {
        renderRoutes(["/agendamentos/1"], withSession)

        expect(
            await screen.findByRole("button", { name: "Voltar para Agendamentos" })
        ).toBeInTheDocument()
        expect(screen.queryByText("Em construção.")).not.toBeInTheDocument()
        await waitFor(() =>
            expect(requestedUrls().some((url) => url.endsWith("/api/v1/appointments/1"))).toBe(true)
        )
    })

    it("mostra a NotFound ao funcionário com todas as permissões em /whatsapp sem chamar a API do WhatsApp", async () => {
        renderRoutes([ROUTES.whatsapp], withStaffSession)

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

        expect(await screen.findByRole("heading", { name: "Agendamentos" })).toBeInTheDocument()
    })

    it("volta do aviso para a tela de entrada sem redirect quando o logout dá certo", async () => {
        const user = userEvent.setup()
        stubFetchByUrl(() => new Response(null, { status: 204 }))
        const { router, store } = renderRoutes([ROUTES.dashboard], {
            account: { current: staffWith([]), status: "authenticated" }
        })

        await user.click(await screen.findByRole("button", { name: "Voltar para o login" }))

        expect(await screen.findByRole("heading", { name: "Entrar" })).toBeInTheDocument()
        expect(requestedUrls().some((url) => url.endsWith("/api/v1/auth/logout"))).toBe(true)
        expect(store.getState().account).toEqual({ current: null, status: "anonymous" })
        expect(router.state.location.pathname).toBe(ROUTES.login)
        expect(router.state.location.search).toBe("")
        expect(router.state.historyAction).toBe("REPLACE")
        expect(screen.queryByRole("heading", { name: NO_ACCESS_HEADING })).not.toBeInTheDocument()
    })

    it("mantém o aviso e mostra o toast quando o logout falha", async () => {
        const user = userEvent.setup()
        stubFetchByUrl(
            () =>
                new Response(JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "x" } }), {
                    status: 500
                })
        )
        const { router, store } = renderRoutes([ROUTES.dashboard], {
            account: { current: staffWith([]), status: "authenticated" }
        })

        await user.click(await screen.findByRole("button", { name: "Voltar para o login" }))

        expect(
            await screen.findByText("Não foi possível sair agora. Tente de novo.")
        ).toBeInTheDocument()
        expect(screen.getByRole("heading", { name: NO_ACCESS_HEADING })).toBeInTheDocument()
        expect(store.getState().account.status).toBe("authenticated")
        expect(router.state.location.pathname).toBe(ROUTES.dashboard)
    })

    it("mostra o aviso quando a conta sem permissões entra com o redirect para Usuários", async () => {
        const user = userEvent.setup()
        stubLoginAs([])
        const { router } = renderRoutes(["/login?redirect=%2Fusuarios"], withoutSession)

        await submitLogin(user)

        expect(await screen.findByRole("heading", { name: NO_ACCESS_HEADING })).toBeInTheDocument()
        expect(router.state.location.pathname).toBe(ROUTES.users)
        expect(screen.queryByRole("heading", { name: "404 - Not Found" })).not.toBeInTheDocument()
    })

    it("mostra o aviso quando a conta que só vê sessões entra sem redirect", async () => {
        const user = userEvent.setup()
        stubLoginAs(["sessions.view"])
        renderRoutes([ROUTES.login], withoutSession)

        await submitLogin(user)

        expect(await screen.findByRole("heading", { name: NO_ACCESS_HEADING })).toBeInTheDocument()
        expect(screen.queryByRole("heading", { name: "404 - Not Found" })).not.toBeInTheDocument()
    })

    it("abre Usuários quando a conta que vê relatórios e gerencia usuários entra sem redirect", async () => {
        const user = userEvent.setup()
        stubLoginAs(["reports.view", "users.manage"])
        const { router } = renderRoutes([ROUTES.login], withoutSession)

        await submitLogin(user)

        expect(await screen.findByRole("heading", { name: "Usuários" })).toBeInTheDocument()
        expect(router.state.location.pathname).toBe(ROUTES.users)
        expect(screen.queryByRole("heading", { name: "404 - Not Found" })).not.toBeInTheDocument()
    })
})
