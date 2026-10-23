import { screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import buildUserAccount from "@/testUtils/buildUserAccount"
import renderUsersPage from "@/testUtils/renderUsersPage"
import USERS_FIXTURE from "@/testUtils/usersFixture"

vi.setConfig({ testTimeout: 20000 })

type Reply = { status: number; body?: unknown }

const PASSWORD = "senha-inicial-77"

const ELISA = buildUserAccount({ id: 15, name: "Elisa Prado", email: "elisa@exemplo.gov.br" })

afterEach(() => {
    vi.unstubAllGlobals()
})

async function renderCreate(post: () => Reply | Promise<Reply>) {
    let created = false
    const page = await renderUsersPage({
        handlers: {
            "GET /api/v1/users": () => ({
                status: 200,
                body: {
                    data: created
                        ? { ...USERS_FIXTURE, items: [...USERS_FIXTURE.items, ELISA] }
                        : USERS_FIXTURE
                }
            }),
            "POST /api/v1/users": async () => {
                const reply = await post()
                created = reply.status === 201

                return reply
            }
        }
    })
    await screen.findByRole("list", { name: "Contas" })

    return page
}

async function fillAndSubmit(user: Awaited<ReturnType<typeof renderCreate>>["user"]) {
    await user.click(screen.getByRole("button", { name: "Criar conta" }))
    const dialog = screen.getByRole("dialog", { name: "Criar conta" })
    await user.type(within(dialog).getByRole("textbox", { name: "Nome" }), "  Elisa Prado ")
    await user.type(
        within(dialog).getByRole("textbox", { name: "E-mail" }),
        "elisa@exemplo.gov.br "
    )
    await user.type(within(dialog).getByLabelText("Senha inicial"), PASSWORD)
    await user.click(within(dialog).getByRole("button", { name: "Criar conta" }))
}

describe("UsersPage criar conta", () => {
    it("envia só nome e e-mail aparados e a senha, recarrega a lista e seleciona a conta nova", async () => {
        const { user, callsTo, store } = await renderCreate(() => ({
            status: 201,
            body: { data: ELISA }
        }))

        await fillAndSubmit(user)

        expect(
            await screen.findByText("Conta criada sem permissões. Marque as permissões abaixo.")
        ).toBeInTheDocument()
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
        expect(callsTo("POST", "/api/v1/users")[0].body).toEqual({
            name: "Elisa Prado",
            email: "elisa@exemplo.gov.br",
            password: PASSWORD
        })
        expect(await screen.findByRole("region", { name: "Elisa Prado" })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: /Elisa Prado/ })).toHaveAttribute(
            "aria-pressed",
            "true"
        )
        expect(callsTo("GET", "/api/v1/users")).toHaveLength(2)
        expect(JSON.stringify(store.getState())).not.toContain(PASSWORD)
        expect(localStorage.length).toBe(0)
        expect(sessionStorage.length).toBe(0)
    })

    it("mantém o rascunho das outras contas depois de criar", async () => {
        const { user } = await renderCreate(() => ({ status: 201, body: { data: ELISA } }))
        await user.click(screen.getByRole("button", { name: /Carla Dias/ }))
        await user.click(screen.getByRole("checkbox", { name: /^Ver relatórios/ }))

        await fillAndSubmit(user)
        await screen.findByRole("region", { name: "Elisa Prado" })

        expect(screen.getByRole("button", { name: /Carla Dias/ })).toHaveTextContent("Não salvo")
        expect(screen.getByRole("button", { name: "1 alteração não salva" })).toBeInTheDocument()
    })

    it("continua aberta com a mensagem do e-mail já usado", async () => {
        const { user } = await renderCreate(() => ({
            status: 409,
            body: { error: { code: "EMAIL_ALREADY_IN_USE", message: "x" } }
        }))

        await fillAndSubmit(user)

        const dialog = screen.getByRole("dialog", { name: "Criar conta" })
        expect(await within(dialog).findByRole("alert")).toHaveTextContent(
            "Este e-mail já está em uso por outra conta."
        )
    })

    it("mostra a mensagem de dados inválidos no 400", async () => {
        const { user } = await renderCreate(() => ({
            status: 400,
            body: { error: { code: "BAD_REQUEST", message: "x" } }
        }))

        await fillAndSubmit(user)

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Confira os dados: nome e e-mail válidos, senha de 8 a 72 caracteres."
        )
    })

    it("bloqueia o e-mail que já está na lista, com outras maiúsculas", async () => {
        const { user } = await renderCreate(() => ({ status: 201, body: { data: ELISA } }))
        await user.click(screen.getByRole("button", { name: "Criar conta" }))
        const dialog = screen.getByRole("dialog", { name: "Criar conta" })

        await user.type(within(dialog).getByRole("textbox", { name: "Nome" }), "Bruno")
        await user.type(
            within(dialog).getByRole("textbox", { name: "E-mail" }),
            "BRUNO@exemplo.gov.br"
        )
        await user.type(within(dialog).getByLabelText("Senha inicial"), PASSWORD)

        expect(
            within(dialog).getByText("Este e-mail já está em uso por outra conta.")
        ).toBeInTheDocument()
        expect(within(dialog).getByRole("button", { name: "Criar conta" })).toBeDisabled()
    })
})
