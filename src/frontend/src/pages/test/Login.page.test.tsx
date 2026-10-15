import { afterEach, describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import LANGUAGE_STORAGE_KEY from "@/i18n/languageStorageKey"
import routes from "@/routers/routes"
import renderWithStore from "@/testUtils/renderWithStore"
import type RootState from "@/types/store/RootState.types"

const admin = {
    id: 1,
    name: "Ana Paula Souza",
    email: "ana@exemplo.gov.br",
    isAdmin: true,
    permissions: []
}

const anonymous: Partial<RootState> = { account: { current: null, status: "anonymous" } }

function stubLogin(response: () => Response | Promise<Response>) {
    const fetchMock = vi.fn(() => Promise.resolve(response()))
    vi.stubGlobal("fetch", fetchMock)
    return fetchMock
}

function renderLogin(entry = "/login", preloadedState: Partial<RootState> = anonymous) {
    const router = createMemoryRouter(routes, { initialEntries: [entry] })
    const result = renderWithStore(<RouterProvider router={router} />, { preloadedState })

    return { ...result, router }
}

async function signIn() {
    const user = userEvent.setup()
    await user.type(await screen.findByRole("textbox", { name: "E-mail" }), "ana@exemplo.gov.br")
    await user.type(screen.getByLabelText("Senha"), "senha-segura")
    await user.click(screen.getByRole("button", { name: "Entrar" }))
}

afterEach(() => {
    vi.unstubAllGlobals()
})

describe("LoginPage", () => {
    it("mostra a marca, os campos, o botão e o texto de apoio, sem recuperação de senha", async () => {
        renderLogin()

        expect(await screen.findByRole("heading", { name: "Entrar" })).toBeInTheDocument()
        expect(screen.getByText("ProconChat Jacareí")).toBeInTheDocument()
        expect(screen.getByText("Painel administrativo · PROCON Jacareí-SP")).toBeInTheDocument()
        const email = screen.getByRole("textbox", { name: "E-mail" })
        expect(email).toHaveAttribute("type", "email")
        expect(email).toHaveAttribute("autocomplete", "username")
        expect(email).toHaveAttribute("placeholder", "nome@jacarei.sp.gov.br")
        const password = screen.getByLabelText("Senha")
        expect(password).toHaveAttribute("type", "password")
        expect(password).toHaveAttribute("autocomplete", "current-password")
        expect(screen.getByRole("button", { name: "Entrar" })).toHaveAttribute("type", "submit")
        expect(
            screen.getByText(
                "Acesso restrito a servidores do PROCON Jacareí. Problemas de acesso devem ser tratados com o administrador do sistema."
            )
        ).toBeInTheDocument()
        expect(screen.queryByText(/esqueci/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/cadastr/i)).not.toBeInTheDocument()
    })

    it("define o título da página", async () => {
        renderLogin()

        await screen.findByRole("heading", { name: "Entrar" })

        expect(document.title).toBe("Entrar - ProconChat")
    })

    it("pede e-mail e senha sem chamar a API quando os campos estão vazios", async () => {
        const user = userEvent.setup()
        const fetchMock = stubLogin(() => new Response(null, { status: 500 }))
        renderLogin()

        await user.click(await screen.findByRole("button", { name: "Entrar" }))

        expect(screen.getByRole("alert")).toHaveTextContent("Informe e-mail e senha.")
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it("desabilita o botão com Entrando... enquanto espera a resposta", async () => {
        const response = Promise.withResolvers<Response>()
        stubLogin(() => response.promise)
        renderLogin()

        await signIn()

        expect(screen.getByRole("button", { name: "Entrando..." })).toBeDisabled()
        response.resolve(new Response(null, { status: 500 }))
        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Não foi possível entrar agora. Verifique a conexão e tente de novo."
        )
    })

    it("volta à rota pedida no redirect depois de entrar", async () => {
        stubLogin(() => new Response(JSON.stringify({ data: { user: admin } }), { status: 200 }))
        const { router } = renderLogin("/login?redirect=%2Fsessoes")

        await signIn()

        expect(await screen.findByRole("heading", { name: "Sessões" })).toBeInTheDocument()
        expect(router.state.location.pathname).toBe("/sessoes")
    })

    it("ignora um redirect para outro site e abre o Dashboard", async () => {
        stubLogin(() => new Response(JSON.stringify({ data: { user: admin } }), { status: 200 }))
        const { router } = renderLogin("/login?redirect=%2F%2Fevil.com")

        await signIn()

        expect(await screen.findByRole("heading", { name: "Painel" })).toBeInTheDocument()
        expect(router.state.location.pathname).toBe("/")
    })

    it("abre o Dashboard quando o Admin entra sem redirect", async () => {
        stubLogin(() => new Response(JSON.stringify({ data: { user: admin } }), { status: 200 }))
        renderLogin()

        await signIn()

        expect(await screen.findByRole("heading", { name: "Painel" })).toBeInTheDocument()
    })

    it("não grava sessão nem conta no navegador depois de entrar", async () => {
        stubLogin(() => new Response(JSON.stringify({ data: { user: admin } }), { status: 200 }))
        renderLogin()

        await signIn()
        await screen.findByRole("heading", { name: "Painel" })

        const keys = Object.keys(window.localStorage)
        expect(keys.filter((key) => key !== LANGUAGE_STORAGE_KEY)).toEqual([])
        expect(window.sessionStorage.length).toBe(0)
        expect(document.cookie).toBe("")
    })

    it("leva quem já está logado direto ao destino", async () => {
        const { router } = renderLogin("/login?redirect=%2Fsessoes", {
            account: { current: admin, status: "authenticated" }
        })

        expect(await screen.findByRole("heading", { name: "Sessões" })).toBeInTheDocument()
        expect(router.state.location.pathname).toBe("/sessoes")
    })
})
