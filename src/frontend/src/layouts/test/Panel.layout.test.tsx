import { afterEach, beforeAll, describe, expect, it } from "vitest"
import { act, screen } from "@testing-library/react"
import userEvent, { type UserEvent } from "@testing-library/user-event"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { routes } from "@/routers/Router"
import { ROUTES } from "@/routers/paths"
import clearToken from "@/services/session/clearToken"
import getToken from "@/services/session/getToken"
import setToken from "@/services/session/setToken"
import { mockMatchMedia, setViewportWidth } from "@/testUtils/mockMatchMedia"
import renderWithStore from "@/testUtils/renderWithStore"
import type { PanelAccount } from "@/types/account"

const admin: PanelAccount = {
    name: "Ana Paula Souza",
    email: "ana@exemplo.gov.br",
    isAdmin: true,
    permissions: []
}

const LAZY_TIMEOUT_MS = 4000

async function renderPanel(path: string = ROUTES.dashboard) {
    setToken("abc")
    const router = createMemoryRouter(routes, { initialEntries: [path] })

    const result = renderWithStore(<RouterProvider router={router} />, {
        preloadedState: { account: { current: admin } }
    })

    await screen.findByText("Em construção.", {}, { timeout: LAZY_TIMEOUT_MS })

    return result
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
    })

    afterEach(() => {
        clearToken()
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

    it("sai limpando o token e a conta e leva para o acesso negado", async () => {
        const user = userEvent.setup()
        const { store } = await renderPanel()

        await user.click(screen.getByRole("button", { name: "Minha conta" }))
        await user.click(screen.getByRole("button", { name: "Sair" }))

        expect(
            await screen.findByRole(
                "heading",
                { name: "Acesso negado." },
                { timeout: LAZY_TIMEOUT_MS }
            )
        ).toBeInTheDocument()
        expect(getToken()).toBeNull()
        expect(store.getState().account.current).toBeNull()
        expect(
            screen.queryByRole("button", { name: "Alterar minha senha" })
        ).not.toBeInTheDocument()
    })

    it("não mostra links nem o bloco de conta quando não há conta", async () => {
        setToken("abc")
        const router = createMemoryRouter(routes, { initialEntries: [ROUTES.dashboard] })

        renderWithStore(<RouterProvider router={router} />)
        await screen.findByText("Em construção.", {}, { timeout: LAZY_TIMEOUT_MS })

        expect(screen.getByRole("navigation", { name: "Menu principal" })).toBeInTheDocument()
        expect(screen.queryAllByRole("link")).toHaveLength(0)
        expect(screen.queryByRole("button", { name: "Minha conta" })).not.toBeInTheDocument()
    })
})
