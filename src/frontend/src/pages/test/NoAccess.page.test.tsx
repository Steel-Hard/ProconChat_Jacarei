import { afterEach, describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import ToastProvider from "@/components/ToastProvider"
import NoAccessPage from "@/pages/NoAccess.page"
import renderWithStore from "@/testUtils/renderWithStore"
import type PanelAccount from "@/types/account/PanelAccount.types"

const account: PanelAccount = {
    id: 7,
    name: "Bruno Sem Acesso",
    email: "bruno.semacesso@exemplo.gov.br",
    isAdmin: false,
    permissions: []
}

function stubFetch(response: () => Response) {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(response()))
    vi.stubGlobal("fetch", fetchMock)
    return fetchMock
}

function renderNoAccess() {
    const router = createMemoryRouter(
        [
            {
                path: "/sessoes",
                element: (
                    <ToastProvider>
                        <NoAccessPage />
                    </ToastProvider>
                )
            },
            { path: "/login", element: <p>Tela de login</p> }
        ],
        { initialEntries: ["/sessoes"] }
    )
    const result = renderWithStore(<RouterProvider router={router} />, {
        preloadedState: { account: { current: account, status: "authenticated" } }
    })

    return { ...result, router }
}

afterEach(() => {
    vi.unstubAllGlobals()
})

describe("NoAccessPage", () => {
    it("mostra o título e a mensagem sem o nome nem o e-mail da conta", () => {
        const fetchMock = stubFetch(() => new Response(null, { status: 204 }))

        renderNoAccess()

        expect(
            screen.getByRole("heading", { name: "Sua conta ainda não tem acesso a nenhuma tela" })
        ).toBeInTheDocument()
        expect(
            screen.getByText(
                "Peça a um administrador do sistema que libere as telas de que você precisa. Depois, entre de novo."
            )
        ).toBeInTheDocument()
        expect(screen.queryByText(/bruno\.semacesso@exemplo\.gov\.br/)).not.toBeInTheDocument()
        expect(screen.queryByText(/Bruno Sem Acesso/)).not.toBeInTheDocument()
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it("define o title e a meta description da página", () => {
        renderNoAccess()

        expect(document.title).toBe("Sem acesso ao painel - ProconChat")
        expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toBe(
            "Esta conta ainda não tem acesso a nenhuma tela do painel."
        )
    })

    it("oferece o botão de voltar para o login, e não um link", () => {
        renderNoAccess()

        expect(screen.getByRole("button", { name: "Voltar para o login" })).toHaveAttribute(
            "type",
            "button"
        )
        expect(screen.queryByRole("link", { name: "Voltar para o login" })).not.toBeInTheDocument()
    })

    it("encerra a sessão e vai ao login sem redirect ao clicar no botão", async () => {
        const user = userEvent.setup()
        const fetchMock = stubFetch(() => new Response(null, { status: 204 }))
        const { store, router } = renderNoAccess()

        await user.click(screen.getByRole("button", { name: "Voltar para o login" }))

        expect(await screen.findByText("Tela de login")).toBeInTheDocument()
        expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/auth\/logout$/)
        expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST" })
        expect(store.getState().account).toEqual({ current: null, status: "anonymous" })
        expect(router.state.location.pathname).toBe("/login")
        expect(router.state.location.search).toBe("")
    })

    it("mantém o aviso e a conta e mostra o toast quando o logout falha", async () => {
        const user = userEvent.setup()
        stubFetch(
            () =>
                new Response(JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "x" } }), {
                    status: 500
                })
        )
        const { store, router } = renderNoAccess()

        await user.click(screen.getByRole("button", { name: "Voltar para o login" }))

        expect(
            await screen.findByText("Não foi possível sair agora. Tente de novo.")
        ).toBeInTheDocument()
        expect(
            screen.getByRole("heading", { name: "Sua conta ainda não tem acesso a nenhuma tela" })
        ).toBeInTheDocument()
        expect(store.getState().account).toEqual({ current: account, status: "authenticated" })
        expect(router.state.location.pathname).toBe("/sessoes")
    })
})
