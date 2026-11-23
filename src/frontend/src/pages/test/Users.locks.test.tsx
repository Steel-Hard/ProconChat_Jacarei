import { screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import buildUserAccount from "@/testUtils/buildUserAccount"
import renderUsersPage from "@/testUtils/renderUsersPage"
import USERS_FIXTURE from "@/testUtils/usersFixture"
import type PanelAccount from "@/types/account/PanelAccount.types"

vi.setConfig({ testTimeout: 20000 })

const CARLA: PanelAccount = {
    id: 3,
    name: "Carla Dias",
    email: "carla@exemplo.gov.br",
    isAdmin: false,
    permissions: ["appointments.view", "users.manage"]
}

const EVA = buildUserAccount({
    id: 12,
    name: "Eva Martins",
    email: "eva@exemplo.gov.br",
    permissions: ["appointments.view"]
})

const LIST = { ...USERS_FIXTURE, items: [...USERS_FIXTURE.items, EVA] }

afterEach(() => {
    vi.unstubAllGlobals()
})

async function openAs(actor: PanelAccount, name: string) {
    const page = await renderUsersPage({ account: actor, list: LIST })
    await page.user.click(await screen.findByRole("button", { name: new RegExp(name) }))

    return { ...page, panel: screen.getByRole("region", { name: new RegExp(name) }) }
}

function box(panel: HTMLElement, name: string): HTMLElement {
    return within(panel).getByRole("checkbox", { name: new RegExp(`^${name}`) })
}

describe("UsersPage regras contra escalada", () => {
    it("trava a própria conta de quem não é Admin", async () => {
        const { panel } = await openAs(CARLA, "Carla Dias")

        expect(
            within(panel)
                .getAllByRole("checkbox")
                .every((item) => (item as HTMLInputElement).disabled)
        ).toBe(true)
        expect(
            within(panel).getByText(
                "Você não pode alterar a própria conta. Peça a outro usuário com a permissão Gerenciar usuários."
            )
        ).toBeInTheDocument()
        expect(within(panel).queryByRole("button", { name: "Redefinir senha" })).toBeNull()
        expect(within(panel).getByRole("button", { name: "Alterar minha senha" })).toBeEnabled()
        const toggle = within(panel).getByRole("button", { name: "Desativar conta" })
        expect(toggle).toBeDisabled()
        expect(toggle).toHaveAccessibleDescription("Você não pode alterar a própria conta")
    })

    it("mostra só Alterar minha senha na própria conta Admin", async () => {
        const { panel } = await openAs(
            {
                id: 1,
                name: "Ana Paula Souza",
                email: "ana@exemplo.gov.br",
                isAdmin: true,
                permissions: []
            },
            "Ana Paula Souza"
        )

        expect(
            within(panel)
                .getAllByRole("button")
                .map((button) => button.textContent)
        ).toEqual(["Alterar minha senha"])
    })

    it("desabilita a permissão que o ator não tem, com o aviso ligado à caixa", async () => {
        const { panel } = await openAs(CARLA, "Eva Martins")

        expect(box(panel, "Ver relatórios")).toBeDisabled()
        expect(box(panel, "Ver relatórios")).toHaveAccessibleDescription(
            "Você não possui esta permissão"
        )
        expect(box(panel, "Gerenciar usuários")).toBeEnabled()
        expect(box(panel, "Ver agendamentos")).toBeEnabled()
        expect(within(panel).getByRole("button", { name: "Redefinir senha" })).toBeEnabled()
        expect(within(panel).getByRole("button", { name: "Desativar conta" })).toBeEnabled()
    })

    it("bloqueia desmarcar Ver agendamentos de quem também gerencia agendamentos", async () => {
        const { panel } = await openAs(CARLA, "Bruno Lima")

        expect(box(panel, "Ver agendamentos")).toBeDisabled()
        expect(box(panel, "Ver agendamentos")).toHaveAccessibleDescription(
            "Desmarcar remove também Gerenciar agendamentos, que você não possui"
        )
        expect(box(panel, "Gerenciar agendamentos")).toHaveAccessibleDescription(
            "Você não possui esta permissão"
        )
    })

    it("bloqueia redefinir e desativar a conta com permissões que o ator não tem", async () => {
        const { panel } = await openAs(CARLA, "Bruno Lima")

        const reset = within(panel).getByRole("button", { name: "Redefinir senha" })
        const toggle = within(panel).getByRole("button", { name: "Desativar conta" })
        expect(reset).toBeDisabled()
        expect(toggle).toBeDisabled()
        expect(reset).toHaveAccessibleDescription("Esta conta tem permissões que você não possui")
        expect(toggle).toHaveAccessibleDescription("Esta conta tem permissões que você não possui")
        expect(
            within(panel).getByText(
                "Esta conta tem permissões que você não possui. Redefinir senha e desativar ficam indisponíveis."
            )
        ).toBeInTheDocument()
    })

    it("bloqueia Reativar conta da conta inativa com permissões que o ator não tem", async () => {
        const { panel } = await openAs(CARLA, "Diego Rocha")

        expect(within(panel).getByRole("button", { name: "Reativar conta" })).toBeDisabled()
    })

    it("não mostra nenhuma ação na conta Admin vista por outra conta", async () => {
        const page = await renderUsersPage({ account: CARLA, list: LIST })

        const panel = await screen.findByRole("region", { name: /Ana Paula Souza/ })

        expect(within(panel).queryAllByRole("button")).toHaveLength(0)
        expect(page.callsTo("GET", "/api/v1/users")).toHaveLength(1)
    })

    it("não bloqueia nada de uma conta comum quando o ator é Admin", async () => {
        const { panel } = await openAs(
            {
                id: 1,
                name: "Ana Paula Souza",
                email: "ana@exemplo.gov.br",
                isAdmin: true,
                permissions: []
            },
            "Bruno Lima"
        )

        expect(
            within(panel)
                .getAllByRole("checkbox")
                .every((item) => !(item as HTMLInputElement).disabled)
        ).toBe(true)
        expect(within(panel).getByRole("button", { name: "Redefinir senha" })).toBeEnabled()
        expect(within(panel).getByRole("button", { name: "Desativar conta" })).toBeEnabled()
        expect(within(panel).queryByText(/Você não possui/)).not.toBeInTheDocument()
    })
})
