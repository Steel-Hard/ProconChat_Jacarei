import { screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import renderUsersPage from "@/testUtils/renderUsersPage"
import USERS_FIXTURE from "@/testUtils/usersFixture"

vi.setConfig({ testTimeout: 20000 })

afterEach(() => {
    vi.unstubAllGlobals()
})

function rowOf(name: string): HTMLElement {
    return screen.getByRole("button", { name: new RegExp(name) })
}

describe("UsersPage", () => {
    it("mostra Carregando... enquanto a lista não chega", async () => {
        const { callsTo } = await renderUsersPage({
            handlers: { "GET /api/v1/users": () => new Promise(() => {}) }
        })

        expect(screen.getByRole("heading", { name: "Usuários" })).toBeInTheDocument()
        expect(
            screen.getByText("Cada conta tem suas próprias permissões, marcadas uma a uma.")
        ).toBeInTheDocument()
        expect(screen.getByText("Carregando...")).toBeInTheDocument()
        await vi.waitFor(() => expect(callsTo("GET", "/api/v1/users")).toHaveLength(1))
    })

    it("mostra cada conta na ordem da API com os dados da linha", async () => {
        await renderUsersPage({ list: USERS_FIXTURE })

        const list = await screen.findByRole("list", { name: "Contas" })
        const rows = within(list).getAllByRole("button")
        expect(rows.map((row) => row.textContent)).toEqual([
            expect.stringContaining("Ana Paula Souza"),
            expect.stringContaining("Bruno Lima"),
            expect.stringContaining("Carla Dias"),
            expect.stringContaining("Diego Rocha")
        ])
        expect(rows[0]).toHaveTextContent("AS")
        expect(rows[0]).toHaveTextContent("ADMIN")
        expect(rows[0]).toHaveTextContent("ana@exemplo.gov.br · Todas as permissões")
        expect(rows[0]).toHaveTextContent("Último acesso em 20/10/2026 às 10:05")
        expect(rows[1]).not.toHaveTextContent("ADMIN")
        expect(rows[1]).toHaveTextContent("bruno@exemplo.gov.br · 2 de 8 permissões")
        expect(rows[1]).toHaveTextContent("Ativo")
        expect(rows[2]).toHaveTextContent("Nunca acessou")
        expect(rows[3]).toHaveTextContent("Inativo")
        expect(rows[3]).toHaveTextContent("1 de 8 permissões")
    })

    it("seleciona a primeira conta e troca ao clicar em outra linha", async () => {
        const { user } = await renderUsersPage({ list: USERS_FIXTURE })
        await screen.findByRole("list", { name: "Contas" })
        const firstSelected = rowOf("Ana Paula Souza").getAttribute("aria-pressed")

        await user.click(rowOf("Bruno Lima"))

        expect(firstSelected).toBe("true")
        expect(rowOf("Bruno Lima")).toHaveAttribute("aria-pressed", "true")
        expect(rowOf("Ana Paula Souza")).toHaveAttribute("aria-pressed", "false")
        const panel = screen.getByRole("region", { name: "Bruno Lima" })
        expect(within(panel).getByText("bruno@exemplo.gov.br")).toBeInTheDocument()
        expect(within(panel).getByText("Último acesso em 19/10/2026 às 14:30")).toBeInTheDocument()
        expect(
            within(panel).getByText("Permissões alteradas por Ana Paula Souza em 18/10/2026")
        ).toBeInTheDocument()
    })

    it("mostra Permissões ainda não alteradas e as 8 permissões na ordem, com nome e descrição", async () => {
        const { user } = await renderUsersPage({ list: USERS_FIXTURE })
        await user.click(await screen.findByRole("button", { name: /Carla Dias/ }))

        const panel = screen.getByRole("region", { name: "Carla Dias" })
        expect(within(panel).getByText("Permissões ainda não alteradas")).toBeInTheDocument()
        const boxes = within(panel).getAllByRole("checkbox")
        const names = [
            "Ver agendamentos",
            "Gerenciar agendamentos",
            "Gerenciar conteúdo do chatbot",
            "Configurar atendimento presencial",
            "Configurar documentos para atendimento presencial",
            "Ver sessões",
            "Ver relatórios",
            "Gerenciar usuários"
        ]
        expect(boxes).toHaveLength(8)
        boxes.forEach((box, index) =>
            expect(box).toHaveAccessibleName(new RegExp(`^${names[index]}`))
        )
        expect(within(panel).getByText("Inclui Ver agendamentos")).toBeInTheDocument()
        expect(
            within(panel).getByText("Criar contas, ativar ou desativar e editar permissões.")
        ).toBeInTheDocument()
        expect(within(panel).getByRole("checkbox", { name: /Gerenciar usuários/ })).toBeChecked()
        expect(within(panel).getByRole("checkbox", { name: /Ver relatórios/ })).not.toBeChecked()
    })

    it("mostra a conta Admin com tudo marcado e desabilitado e as duas notas", async () => {
        await renderUsersPage({
            list: USERS_FIXTURE,
            account: {
                id: 3,
                name: "Carla Dias",
                email: "carla@exemplo.gov.br",
                isAdmin: false,
                permissions: ["users.manage", "appointments.view"]
            }
        })

        const panel = await screen.findByRole("region", { name: /Ana Paula Souza/ })
        const boxes = within(panel).getAllByRole("checkbox")
        expect(boxes).toHaveLength(8)
        expect(
            boxes.every(
                (box) => (box as HTMLInputElement).checked && (box as HTMLInputElement).disabled
            )
        ).toBe(true)
        expect(within(panel).queryByText("Você não possui esta permissão")).not.toBeInTheDocument()
        expect(
            within(panel).getByText(
                "Conta admin: possui todas as permissões e acesso exclusivo à tela de WhatsApp. Não pode ser desativada nem ter permissões removidas."
            )
        ).toBeInTheDocument()
        expect(
            within(panel).getByText(
                "Se a senha da conta Admin for esquecida, a redefinição é feita pela equipe técnica diretamente no servidor."
            )
        ).toBeInTheDocument()
        expect(within(panel).getByText("ADMIN")).toBeInTheDocument()
    })

    it("mostra a última alteração no topo", async () => {
        await renderUsersPage({ list: USERS_FIXTURE })

        expect(
            await screen.findByText("Última alteração por Ana Paula Souza em 18/10/2026")
        ).toBeInTheDocument()
    })

    it("não mostra a última alteração quando a API devolve null", async () => {
        await renderUsersPage({ list: { ...USERS_FIXTURE, lastChange: null } })

        await screen.findByRole("list", { name: "Contas" })

        expect(screen.queryByText(/Última alteração por/)).not.toBeInTheDocument()
    })

    it("não mostra a data de último acesso inválida", async () => {
        const [admin] = USERS_FIXTURE.items
        await renderUsersPage({
            list: { items: [{ ...admin, lastLoginAt: "data-invalida" }], lastChange: null }
        })

        const row = await screen.findByRole("button", { name: /Ana Paula Souza/ })

        expect(row).not.toHaveTextContent("Último acesso")
        expect(row).not.toHaveTextContent("Nunca acessou")
    })

    it("mostra o erro de carregamento sem a lista", async () => {
        await renderUsersPage({
            handlers: {
                "GET /api/v1/users": () => ({
                    status: 500,
                    body: { error: { code: "INTERNAL_ERROR", message: "x" } }
                })
            }
        })

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Não foi possível carregar as contas agora. Tente de novo."
        )
        expect(screen.queryByRole("list", { name: "Contas" })).not.toBeInTheDocument()
        expect(screen.queryByText("Carregando...")).not.toBeInTheDocument()
    })
})
