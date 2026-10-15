import { afterEach, describe, expect, it, vi } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { Provider } from "react-redux"
import { MemoryRouter, useLocation } from "react-router-dom"
import useLogin from "@/pages/hooks/useLogin"
import createStore from "@/store/createStore"

type Responder = (url: string, init?: RequestInit) => Response | Promise<Response>

function jsonResponse(status: number, body?: unknown): Response {
    return new Response(body === undefined ? null : JSON.stringify(body), { status })
}

function userWith(permissions: string[], isAdmin = false) {
    return { id: 9, name: "Bruno Lima", email: "bruno@exemplo.gov.br", isAdmin, permissions }
}

function stubFetch(responder: Responder) {
    const fetchMock = vi.fn((url: string, init?: RequestInit) =>
        Promise.resolve(responder(url, init))
    )
    vi.stubGlobal("fetch", fetchMock)
    return fetchMock
}

function renderLogin(initialEntry = "/login") {
    const store = createStore({ account: { current: null, status: "anonymous" } })
    const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider store={store}>
            <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
        </Provider>
    )
    const rendered = renderHook(() => ({ login: useLogin(), location: useLocation() }), {
        wrapper
    })

    return { ...rendered, store }
}

async function fillAndSubmit(
    result: ReturnType<typeof renderLogin>["result"],
    email = "bruno@exemplo.gov.br",
    password = "senha-segura"
) {
    act(() => result.current.login.setEmail(email))
    act(() => result.current.login.setPassword(password))
    await act(async () => {
        await result.current.login.submit()
    })
}

afterEach(() => {
    vi.unstubAllGlobals()
})

describe("useLogin", () => {
    it("envia e-mail e senha e marca o envio em andamento", async () => {
        const response = Promise.withResolvers<Response>()
        const fetchMock = stubFetch(() => response.promise)
        const { result } = renderLogin()
        act(() => result.current.login.setEmail("bruno@exemplo.gov.br"))
        act(() => result.current.login.setPassword("senha-segura"))

        let pending: Promise<void> = Promise.resolve()
        act(() => {
            pending = result.current.login.submit()
        })

        expect(result.current.login.submitting).toBe(true)
        expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/auth\/login$/)
        expect(fetchMock.mock.calls[0][1]?.body).toBe(
            JSON.stringify({ email: "bruno@exemplo.gov.br", password: "senha-segura" })
        )
        await act(async () => {
            response.resolve(jsonResponse(200, { data: { user: userWith([], true) } }))
            await pending
        })
    })

    it("leva ao Dashboard a conta que só vê sessões", async () => {
        stubFetch(() => jsonResponse(200, { data: { user: userWith(["sessions.view"]) } }))
        const { result, store } = renderLogin()

        await fillAndSubmit(result)

        expect(store.getState().account.status).toBe("authenticated")
        expect(result.current.login.destination).toBe("/")
    })

    it("leva ao Conteúdo a conta que só gerencia conteúdo", async () => {
        stubFetch(() => jsonResponse(200, { data: { user: userWith(["content.manage"]) } }))
        const { result } = renderLogin()

        await fillAndSubmit(result)

        expect(result.current.login.destination).toBe("/conteudo")
    })

    it("mostra credenciais incorretas no 401, mantém o e-mail e o redirect e limpa a senha", async () => {
        const fetchMock = stubFetch(() =>
            jsonResponse(401, { error: { code: "UNAUTHORIZED", message: "Invalid credentials" } })
        )
        const { result } = renderLogin("/login?redirect=%2Fsessoes")

        await fillAndSubmit(result)

        expect(result.current.login.error).toBe("E-mail ou senha incorretos.")
        expect(result.current.login.email).toBe("bruno@exemplo.gov.br")
        expect(result.current.login.password).toBe("")
        expect(result.current.login.submitting).toBe(false)
        expect(result.current.location.search).toBe("?redirect=%2Fsessoes")
        expect(result.current.login.destination).toBe("/sessoes")
        expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it("mostra credenciais incorretas no 400", async () => {
        stubFetch(() => jsonResponse(400, { error: { code: "BAD_REQUEST", message: "x" } }))
        const { result } = renderLogin()

        await fillAndSubmit(result)

        expect(result.current.login.error).toBe("E-mail ou senha incorretos.")
    })

    it("pede para aguardar no 429", async () => {
        stubFetch(() => jsonResponse(429, { error: { code: "TOO_MANY_REQUESTS", message: "x" } }))
        const { result } = renderLogin()

        await fillAndSubmit(result)

        expect(result.current.login.error).toBe(
            "Muitas tentativas sem sucesso. Aguarde alguns minutos e tente de novo."
        )
    })

    it("explica a origem não autorizada no 403 INVALID_ORIGIN", async () => {
        stubFetch(() => jsonResponse(403, { error: { code: "INVALID_ORIGIN", message: "x" } }))
        const { result } = renderLogin()

        await fillAndSubmit(result)

        expect(result.current.login.error).toBe(
            "O painel foi aberto por um endereço não autorizado. Acesse pelo endereço oficial do painel."
        )
    })

    it("mostra a falha genérica quando a rede falha", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")))
        const { result } = renderLogin()

        await fillAndSubmit(result)

        expect(result.current.login.error).toBe(
            "Não foi possível entrar agora. Verifique a conexão e tente de novo."
        )
        expect(result.current.login.password).toBe("")
    })

    it.each([
        [500, "INTERNAL_SERVER_ERROR"],
        [403, "FORBIDDEN"]
    ])("mostra a falha genérica com status %s e código %s", async (status, code) => {
        stubFetch(() => jsonResponse(status, { error: { code, message: "x" } }))
        const { result } = renderLogin()

        await fillAndSubmit(result)

        expect(result.current.login.error).toBe(
            "Não foi possível entrar agora. Verifique a conexão e tente de novo."
        )
    })

    it("faz uma única requisição num clique duplo", async () => {
        const response = Promise.withResolvers<Response>()
        const fetchMock = stubFetch(() => response.promise)
        const { result } = renderLogin()
        act(() => result.current.login.setEmail("bruno@exemplo.gov.br"))
        act(() => result.current.login.setPassword("senha-segura"))

        let first: Promise<void> = Promise.resolve()
        let second: Promise<void> = Promise.resolve()
        act(() => {
            first = result.current.login.submit()
            second = result.current.login.submit()
        })
        await act(async () => {
            response.resolve(jsonResponse(200, { data: { user: userWith([], true) } }))
            await Promise.all([first, second])
        })

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    })
})
