import { lazy } from "react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { act, screen } from "@testing-library/react"
import userEvent, { type UserEvent } from "@testing-library/user-event"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import PanelLayout from "@/layouts/Panel.layout"
import UnderConstructionPage from "@/pages/UnderConstruction.page"
import routes from "@/routers/routes"
import ROUTES from "@/routers/paths"
import mockMatchMedia from "@/testUtils/mockMatchMedia"
import setViewportWidth from "@/testUtils/setViewportWidth"
import renderWithStore from "@/testUtils/renderWithStore"
import type PanelAccount from "@/types/account/PanelAccount.types"

const admin: PanelAccount = {
    id: 1,
    name: "Ana Paula Souza",
    email: "ana@exemplo.gov.br",
    isAdmin: true,
    permissions: []
}

const LAZY_TIMEOUT_MS = 4000

const NeverResolves = lazy(() => new Promise<never>(() => {}))

async function renderPanel(path: string = ROUTES.dashboard) {
    const router = createMemoryRouter(routes, { initialEntries: [path] })

    const result = renderWithStore(<RouterProvider router={router} />, {
        preloadedState: { account: { current: admin, status: "authenticated" } }
    })

    await screen.findByText("Em construção.", {}, { timeout: LAZY_TIMEOUT_MS })

    return { ...result, router }
}

function stubLogout(response: () => Response) {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(response()))
    vi.stubGlobal("fetch", fetchMock)
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
        await import("@/pages/UnderConstruction.page")
        await import("@/pages/Login.page")
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it("mostra o menu, o topo e a tela dentro do main", async () => {
        await renderPanel()

        expect(screen.getByRole("navigation", { name: "Menu principal" })).toBeInTheDocument()
        expect(screen.getByRole("banner")).toBeInTheDocument()
        expect(screen.getByRole("main")).toContainElement(
            screen.getByRole("heading", { name: "Painel" })
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
        expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/auth\/logout$/)
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

        renderWithStore(<RouterProvider router={router} />)
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

        renderWithStore(<RouterProvider router={router} />, {
            preloadedState: { account: { current: admin, status: "authenticated" } }
        })

        expect(screen.getByRole("main")).toHaveTextContent("Carregando...")
        expect(screen.getByRole("navigation", { name: "Menu principal" })).toBeInTheDocument()
        expect(screen.getByRole("banner")).toBeInTheDocument()
    })
})
