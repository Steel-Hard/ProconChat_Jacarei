import { afterEach, describe, expect, it, vi } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import ToastProvider from "@/components/ToastProvider"
import useLogout from "@/hooks/useLogout"
import renderWithStore from "@/testUtils/renderWithStore"
import type PanelAccount from "@/types/account/PanelAccount.types"

const account: PanelAccount = {
    id: 1,
    name: "Ana",
    email: "ana@exemplo.gov.br",
    isAdmin: true,
    permissions: []
}

function LogoutButton() {
    const logout = useLogout()

    return (
        <button type="button" onClick={() => void logout()}>
            Sair
        </button>
    )
}

function stubFetch(response: () => Response | Promise<Response>) {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(response()))
    vi.stubGlobal("fetch", fetchMock)
    return fetchMock
}

function renderLogout() {
    const router = createMemoryRouter(
        [
            {
                element: (
                    <ToastProvider>
                        <LogoutButton />
                    </ToastProvider>
                ),
                path: "/sessoes"
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

describe("useLogout", () => {
    it("chama o logout, limpa a conta e vai ao login sem redirect", async () => {
        const user = userEvent.setup()
        const fetchMock = stubFetch(() => new Response(null, { status: 204 }))
        const { store, router } = renderLogout()

        await user.click(screen.getByRole("button", { name: "Sair" }))

        expect(await screen.findByText("Tela de login")).toBeInTheDocument()
        expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/auth\/logout$/)
        expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST" })
        expect(store.getState().account).toEqual({ current: null, status: "anonymous" })
        expect(router.state.location.search).toBe("")
    })

    it("mantém a conta e mostra o aviso quando o logout falha", async () => {
        const user = userEvent.setup()
        stubFetch(
            () =>
                new Response(JSON.stringify({ error: { code: "INVALID_ORIGIN", message: "x" } }), {
                    status: 403
                })
        )
        const { store, router } = renderLogout()

        await user.click(screen.getByRole("button", { name: "Sair" }))

        expect(
            await screen.findByText("Não foi possível sair agora. Tente de novo.")
        ).toBeInTheDocument()
        expect(store.getState().account).toEqual({ current: account, status: "authenticated" })
        expect(router.state.location.pathname).toBe("/sessoes")
    })

    it("faz uma única requisição num clique duplo", async () => {
        const user = userEvent.setup()
        const response = Promise.withResolvers<Response>()
        const fetchMock = stubFetch(() => response.promise)
        renderLogout()

        await user.dblClick(screen.getByRole("button", { name: "Sair" }))
        response.resolve(new Response(null, { status: 204 }))

        expect(await screen.findByText("Tela de login")).toBeInTheDocument()
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    })
})
