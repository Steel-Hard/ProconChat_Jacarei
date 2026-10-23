import { screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import renderUsersPage from "@/testUtils/renderUsersPage"
import USERS_FIXTURE from "@/testUtils/usersFixture"

vi.setConfig({ testTimeout: 20000 })

type Reply = { status: number; body?: unknown }

const PASSWORD = "senha-nova-redefinida"

afterEach(() => {
    vi.unstubAllGlobals()
})

async function openReset(reply: () => Reply | Promise<Reply>) {
    const page = await renderUsersPage({
        list: USERS_FIXTURE,
        handlers: { "POST /api/v1/users/7/reset-password": reply }
    })
    await page.user.click(await screen.findByRole("button", { name: /Bruno Lima/ }))
    await page.user.click(screen.getByRole("button", { name: "Redefinir senha" }))

    return page
}

async function fill(user: Awaited<ReturnType<typeof openReset>>["user"]) {
    await user.type(screen.getByLabelText("Nova senha inicial"), PASSWORD)
    await user.type(screen.getByLabelText("Confirmar senha"), PASSWORD)
    await user.click(
        within(screen.getByRole("dialog")).getByRole("button", { name: "Redefinir senha" })
    )
}

describe("UsersPage senhas", () => {
    it("abre a janela de redefinir com o nome e o texto", async () => {
        await openReset(() => ({ status: 200, body: { data: { reset: true } } }))

        const dialog = screen.getByRole("dialog", { name: "Redefinir senha de Bruno Lima" })
        expect(dialog).toHaveAccessibleDescription(
            "Defina uma nova senha inicial e informe-a pessoalmente ao funcionário. A senha anterior deixa de funcionar imediatamente."
        )
    })

    it("redefine a senha, fecha a janela e avisa, sem guardar a senha nem mexer no rascunho", async () => {
        const { user, callsTo, store } = await openReset(() => ({
            status: 200,
            body: { data: { reset: true } }
        }))

        await fill(user)

        expect(
            await screen.findByText("Senha de Bruno Lima redefinida. Informe-a pessoalmente.")
        ).toBeInTheDocument()
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
        expect(callsTo("POST", "/api/v1/users/7/reset-password")[0].body).toEqual({
            password: PASSWORD
        })
        expect(screen.queryByText("Não salvo")).not.toBeInTheDocument()
        expect(screen.queryByRole("button", { name: /não salva/ })).not.toBeInTheDocument()
        expect(JSON.stringify(store.getState())).not.toContain(PASSWORD)
        expect(localStorage.length).toBe(0)
        expect(sessionStorage.length).toBe(0)
    })

    it("continua aberta com a mensagem do código recusado", async () => {
        const { user } = await openReset(() => ({
            status: 403,
            body: { error: { code: "TARGET_HAS_MORE_PERMISSIONS", message: "x" } }
        }))

        await fill(user)

        const dialog = screen.getByRole("dialog", { name: "Redefinir senha de Bruno Lima" })
        expect(await within(dialog).findByRole("alert")).toHaveTextContent(
            "Esta conta tem permissões que você não possui."
        )
    })

    it("abre Alterar minha senha com o e-mail de quem está logado", async () => {
        const { user } = await renderUsersPage({ list: USERS_FIXTURE })

        await user.click(await screen.findByRole("button", { name: "Alterar minha senha" }))

        const dialog = screen.getByRole("dialog", { name: "Alterar minha senha" })
        expect(dialog).toHaveAccessibleDescription(
            "ana@exemplo.gov.br · A nova senha vale a partir do próximo acesso."
        )
        await user.click(within(dialog).getByRole("button", { name: "Cancelar" }))
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
})
