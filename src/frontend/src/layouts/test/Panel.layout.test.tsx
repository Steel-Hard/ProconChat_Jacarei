import { lazy } from "react"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { act, screen } from "@testing-library/react"
import userEvent, { type UserEvent } from "@testing-library/user-event"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import type PanelLayoutComponent from "@/layouts/Panel.layout"
import type UnderConstructionComponent from "@/pages/UnderConstruction.page"
import ROUTES from "@/routers/paths"
import mockMatchMedia from "@/testUtils/mockMatchMedia"
import setViewportWidth from "@/testUtils/setViewportWidth"
import loadPanelRoutes from "@/testUtils/loadPanelRoutes"
import withPendingCount from "@/testUtils/withPendingCount"
import type PanelAccount from "@/types/account/PanelAccount.types"

vi.mock("@/navigation/navItemsReady", () => ({
    default: {
        dashboard: true,
        appointments: true,
        reports: true,
        content: true,
        sessions: true,
        schedule: true,
        documents: true,
        users: true,
        whatsapp: true
    }
}))

const admin: PanelAccount = {
    id: 1,
    name: "Ana Paula Souza",
    email: "ana@exemplo.gov.br",
    isAdmin: true,
    permissions: []
}

const LAZY_TIMEOUT_MS = 4000

const NeverResolves = lazy(() => new Promise<never>(() => {}))

let panel: Awaited<ReturnType<typeof loadPanelRoutes>>
let PanelLayout: typeof PanelLayoutComponent
let UnderConstructionPage: typeof UnderConstructionComponent

async function renderPanel(path: string = ROUTES.sessions) {
    const router = createMemoryRouter(panel.routes, { initialEntries: [path] })

    const result = panel.renderWithStore(<RouterProvider router={router} />, {
        preloadedState: { account: { current: admin, status: "authenticated" } }
    })

    await screen.findByText("Em construção.", {}, { timeout: LAZY_TIMEOUT_MS })

    return { ...result, router }
}

function stubLogout(response: () => Response) {
    const fetchMock = vi.fn((_url: RequestInfo | URL, _init?: RequestInit) =>
        Promise.resolve(response())
    )
    vi.stubGlobal("fetch", vi.fn(withPendingCount(fetchMock)))
    return fetchMock
}

async function openDrawer(user: UserEvent) {
    mockMatchMedia(1024)
    await renderPanel()
    await user.click(screen.getByRole("button", { name: "Menu" }))
    expect(screen.getByRole("link", { name: "Sessões" })).toBeInTheDocument()
}

describe("PanelLayout", { timeout: 15000 }, () => {
    beforeAll(async () => {
        panel = await loadPanelRoutes([
            () => import("@/pages/UnderConstruction.page"),
            () => import("@/pages/Login.page"),
            () => import("@/pages/NotFound.page")
        ])
        PanelLayout = (await import("@/layouts/Panel.layout")).default
        UnderConstructionPage = (await import("@/pages/UnderConstruction.page")).default
    })

    beforeEach(() => {
        vi.stubGlobal("fetch", vi.fn(withPendingCount()))
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        vi.unstubAllEnvs()
    })

    it("mostra o menu, o topo e a tela dentro do main", async () => {
        await renderPanel()

        expect(screen.getByRole("navigation", { name: "Menu principal" })).toBeInTheDocument()
        expect(screen.getByRole("banner")).toBeInTheDocument()
        expect(screen.getByRole("main")).toContainElement(
            screen.getByRole("heading", { name: "Sessões" })
        )
    })

    it("navega pelo menu sem sair do layout", async () => {
        const user = userEvent.setup()
        await renderPanel()

        await user.click(screen.getByRole("link", { name: "Sessões" }))

        expect(
            await screen.findByRole("heading", { name: "Sessões" }, { timeout: LAZY_TIMEOUT_MS })
        ).toBeInTheDocument()
        expect(screen.getByRole("link", { name: "Sessões" })).toHaveAttribute(
            "aria-current",
            "page"
        )
        expect(screen.getByRole("navigation", { name: "Menu principal" })).toBeInTheDocument()
    })

    it("não mostra o botão Menu em tela larga", async () => {
        mockMatchMedia(1440)

        await renderPanel()

        expect(screen.queryByRole("button", { name: "Menu" })).not.toBeInTheDocument()
        expect(screen.getByRole("link", { name: "Sessões" })).toBeInTheDocument()
    })

    it("mostra o botão Menu e esconde o menu em tela estreita até abrir", async () => {
        const user = userEvent.setup()
        mockMatchMedia(1024)
        await renderPanel()
        const button = screen.getByRole("button", { name: "Menu" })
        expect(button).toHaveAttribute("aria-expanded", "false")
        expect(screen.queryByRole("link", { name: "Sessões" })).not.toBeInTheDocument()

        await user.click(button)

        expect(button).toHaveAttribute("aria-expanded", "true")
        expect(screen.getByRole("link", { name: "Sessões" })).toBeInTheDocument()
    })

    it("leva o foco ao menu ao abrir a gaveta e tira o fundo do foco", async () => {
        const user = userEvent.setup()
        await openDrawer(user)

        expect(screen.getByRole("link", { name: "Dashboard" })).toHaveFocus()
        expect(screen.getByRole("banner").parentElement).toHaveAttribute("inert")

        await user.keyboard("{Escape}")

        expect(screen.getByRole("banner").parentElement).not.toHaveAttribute("inert")
    })

    it("fecha a gaveta ao clicar na sobreposição", async () => {
        const user = userEvent.setup()
        await openDrawer(user)

        await user.click(screen.getByRole("presentation"))

        expect(screen.queryByRole("link", { name: "Sessões" })).not.toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Menu" })).toHaveFocus()
    })

    it("fecha a gaveta com Esc", async () => {
        const user = userEvent.setup()
        await openDrawer(user)

        await user.keyboard("{Escape}")

        expect(screen.queryByRole("link", { name: "Sessões" })).not.toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Menu" })).toHaveFocus()
    })

    it("fecha a gaveta ao clicar num link", async () => {
        const user = userEvent.setup()
        await openDrawer(user)

        await user.click(screen.getByRole("link", { name: "Sessões" }))

        expect(
            await screen.findByRole("heading", { name: "Sessões" }, { timeout: LAZY_TIMEOUT_MS })
        ).toBeInTheDocument()
        expect(screen.queryByRole("link", { name: "Sessões" })).not.toBeInTheDocument()
    })

    it("fecha a gaveta quando a tela passa a ser larga", async () => {
        const user = userEvent.setup()
        await openDrawer(user)

        act(() => setViewportWidth(1300))

        expect(screen.queryByRole("presentation")).not.toBeInTheDocument()
        expect(screen.queryByRole("button", { name: "Menu" })).not.toBeInTheDocument()

        act(() => setViewportWidth(1024))

        expect(screen.getByRole("button", { name: "Menu" })).toHaveAttribute(
            "aria-expanded",
            "false"
        )
        expect(screen.queryByRole("link", { name: "Sessões" })).not.toBeInTheDocument()
    })

    it("sai pelo logout da API, limpa a conta e leva para a tela de entrada sem redirect", async () => {
        const user = userEvent.setup()
        const fetchMock = stubLogout(() => new Response(null, { status: 204 }))
        const { store, router } = await renderPanel()

        await user.click(screen.getByRole("button", { name: "Minha conta" }))
        await user.click(screen.getByRole("button", { name: "Sair" }))

        expect(
            await screen.findByRole("heading", { name: "Entrar" }, { timeout: LAZY_TIMEOUT_MS })
        ).toBeInTheDocument()
        expect(store.getState().account.current).toBeNull()
        const requestedUrls = fetchMock.mock.calls.map(([input]) => {
            const value: unknown = input

            return value instanceof Request ? value.url : String(value)
        })
        expect(requestedUrls).toContainEqual(expect.stringMatching(/\/api\/v1\/auth\/logout$/))
        expect(router.state.location.pathname).toBe(ROUTES.login)
        expect(router.state.location.search).toBe("")
        expect(
            screen.queryByRole("button", { name: "Alterar minha senha" })
        ).not.toBeInTheDocument()
    })

    it("mostra Alterar minha senha e Sair no menu da conta", async () => {
        const user = userEvent.setup()
        await renderPanel()

        await user.click(screen.getByRole("button", { name: "Minha conta" }))

        expect(screen.getByRole("button", { name: "Alterar minha senha" })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Sair" })).toBeInTheDocument()
    })

    it("abre o modal de senha pelo menu da conta com o e-mail da conta", async () => {
        const user = userEvent.setup()
        await renderPanel()

        await user.click(screen.getByRole("button", { name: "Minha conta" }))
        await user.click(screen.getByRole("button", { name: "Alterar minha senha" }))

        expect(screen.getByRole("dialog", { name: "Alterar minha senha" })).toBeInTheDocument()
        expect(
            screen.getByText("ana@exemplo.gov.br · A nova senha vale a partir do próximo acesso.")
        ).toBeInTheDocument()
        expect(screen.getByLabelText("Senha atual")).toHaveFocus()
    })

    it("mostra a NotFound quando o login volta a uma tela que a conta não pode acessar", async () => {
        const user = userEvent.setup()
        vi.stubGlobal(
            "fetch",
            vi.fn(
                async () =>
                    new Response(
                        JSON.stringify({
                            data: {
                                user: {
                                    id: 8,
                                    name: "Bruno Lima",
                                    email: "bruno@exemplo.gov.br",
                                    isAdmin: false,
                                    permissions: ["appointments.view"]
                                }
                            }
                        }),
                        { status: 200 }
                    )
            )
        )
        const router = createMemoryRouter(panel.routes, {
            initialEntries: ["/login?redirect=%2Fusuarios"]
        })
        panel.renderWithStore(<RouterProvider router={router} />, {
            preloadedState: { account: { current: null, status: "anonymous" } }
        })

        await user.type(
            await screen.findByRole("textbox", { name: "E-mail" }, { timeout: LAZY_TIMEOUT_MS }),
            "bruno@exemplo.gov.br"
        )
        await user.type(screen.getByLabelText("Senha"), "senha-segura")
        await user.click(screen.getByRole("button", { name: "Entrar" }))

        expect(
            await screen.findByRole(
                "heading",
                { name: "404 - Not Found" },
                { timeout: LAZY_TIMEOUT_MS }
            )
        ).toBeInTheDocument()
        expect(router.state.location.pathname).toBe(ROUTES.users)
        expect(screen.queryByRole("navigation", { name: "Menu principal" })).not.toBeInTheDocument()
    })

    it("depois de sair, voltar a uma rota do painel leva ao login", async () => {
        const user = userEvent.setup()
        stubLogout(() => new Response(null, { status: 204 }))
        const { router } = await renderPanel(ROUTES.sessions)
        await user.click(screen.getByRole("button", { name: "Minha conta" }))
        await user.click(screen.getByRole("button", { name: "Sair" }))
        await screen.findByRole("heading", { name: "Entrar" }, { timeout: LAZY_TIMEOUT_MS })

        await act(() => router.navigate(ROUTES.sessions))

        expect(await screen.findByRole("heading", { name: "Entrar" })).toBeInTheDocument()
        expect(router.state.location.search).toBe("?redirect=%2Fsessoes")
        expect(screen.queryByRole("navigation", { name: "Menu principal" })).not.toBeInTheDocument()
    })

    it("continua no painel e avisa quando o logout é recusado por origem", async () => {
        const user = userEvent.setup()
        stubLogout(
            () =>
                new Response(JSON.stringify({ error: { code: "INVALID_ORIGIN", message: "x" } }), {
                    status: 403
                })
        )
        const { store, router } = await renderPanel(ROUTES.sessions)

        await user.click(screen.getByRole("button", { name: "Minha conta" }))
        await user.click(screen.getByRole("button", { name: "Sair" }))

        expect(
            await screen.findByText("Não foi possível sair agora. Tente de novo.")
        ).toBeInTheDocument()
        expect(store.getState().account.current).toEqual(admin)
        expect(router.state.location.pathname).toBe(ROUTES.sessions)
        expect(screen.getByRole("heading", { name: "Sessões" })).toBeInTheDocument()
    })

    it("não mostra links nem o bloco de conta quando não há conta", async () => {
        const router = createMemoryRouter(
            [
                {
                    element: <PanelLayout />,
                    children: [
                        {
                            path: ROUTES.dashboard,
                            element: <UnderConstructionPage titleKey="dashboard" />
                        }
                    ]
                }
            ],
            { initialEntries: [ROUTES.dashboard] }
        )

        panel.renderWithStore(<RouterProvider router={router} />)
        await screen.findByText("Em construção.", {}, { timeout: LAZY_TIMEOUT_MS })

        expect(screen.getByRole("navigation", { name: "Menu principal" })).toBeInTheDocument()
        expect(screen.queryAllByRole("link")).toHaveLength(0)
        expect(screen.queryByRole("button", { name: "Minha conta" })).not.toBeInTheDocument()
    })

    it("mostra o carregamento dentro do main sem esconder o menu e o topo", () => {
        const router = createMemoryRouter(
            [{ element: <PanelLayout />, children: [{ path: "/", element: <NeverResolves /> }] }],
            { initialEntries: ["/"] }
        )

        panel.renderWithStore(<RouterProvider router={router} />, {
            preloadedState: { account: { current: admin, status: "authenticated" } }
        })

        expect(screen.getByRole("main")).toHaveTextContent("Carregando...")
        expect(screen.getByRole("navigation", { name: "Menu principal" })).toBeInTheDocument()
        expect(screen.getByRole("banner")).toBeInTheDocument()
    })
    it("mostra no menu o número de agendamentos pendentes vindo da API", async () => {
        vi.stubEnv("VITE_API_URL", "http://api.test")
        vi.resetModules()
        vi.stubGlobal(
            "fetch",
            vi.fn(
                async () =>
                    new Response(JSON.stringify({ data: { count: 3 } }), {
                        status: 200,
                        headers: { "Content-Type": "application/json" }
                    })
            )
        )
        const { default: FreshPanelLayout } = await import("@/layouts/Panel.layout")
        const { default: freshRenderWithStore } = await import("@/testUtils/renderWithStore")
        const router = createMemoryRouter(
            [{ element: <FreshPanelLayout />, children: [{ path: "/", element: <p /> }] }],
            { initialEntries: ["/"] }
        )

        freshRenderWithStore(<RouterProvider router={router} />, {
            preloadedState: { account: { current: admin, status: "authenticated" } }
        })

        expect(
            await screen.findByRole("link", { name: "Agendamentos 3 agendamentos pendentes" })
        ).toBeInTheDocument()
    })
})
