import { screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import renderUsersPage from "@/testUtils/renderUsersPage"
import USERS_FIXTURE from "@/testUtils/usersFixture"
import type UserAccountList from "@/types/users/UserAccountList.types"

vi.setConfig({ testTimeout: 20000 })

type Reply = { status: number; body?: unknown }

const FUTURE_PATH = "GET /api/v1/users/7/future-appointments"

const TWO_APPOINTMENTS = [
    {
        id: "11",
        protocol: "AB12CD34",
        name: "Maria Souza",
        appointmentDatetime: "2026-10-30T13:00:00.000Z",
        status: "CONFIRMED"
    },
    {
        id: "12",
        protocol: "EF56GH78",
        name: "João Pereira",
        appointmentDatetime: "2026-10-31T17:30:00.000Z",
        status: "CONFIRMED"
    }
]

afterEach(() => {
    vi.unstubAllGlobals()
})

async function openBruno(
    future: () => Reply | Promise<Reply> = () => ({
        status: 200,
        body: { data: TWO_APPOINTMENTS }
    }),
    list: UserAccountList = USERS_FIXTURE
) {
    const page = await renderUsersPage({
        list,
        handlers: {
            [FUTURE_PATH]: future,
            "PATCH /api/v1/users": () => ({
                status: 200,
                body: { data: { ...USERS_FIXTURE, redistributed: 2 } }
            })
        }
    })
    await page.user.click(await screen.findByRole("button", { name: /Bruno Lima/ }))

    return page
}

function brunoRow(): HTMLElement {
    return screen.getByRole("button", { name: /Bruno Lima/ })
}

async function pendingList(user: Awaited<ReturnType<typeof openBruno>>["user"]): Promise<string> {
    await user.hover(screen.getByRole("button", { name: /não salvas?$/ }))

    return screen.getByRole("tooltip").textContent ?? ""
}

describe("UsersPage redistribuição dos agendamentos futuros", () => {
    it("abre a janela ao desativar uma conta com agendamentos futuros", async () => {
        const { user, callsTo } = await openBruno()

        await user.click(screen.getByRole("button", { name: "Desativar conta" }))

        const dialog = await screen.findByRole("dialog", {
            name: "Esta conta é responsável por 2 agendamentos futuros"
        })
        expect(dialog).toHaveAccessibleDescription(
            "Bruno Lima será desativada. Escolha o que acontece com estes agendamentos. A mudança só vale ao salvar."
        )
        const items = within(within(dialog).getByRole("list")).getAllByRole("listitem")
        expect(items[0]).toHaveTextContent("AB12CD34")
        expect(items[0]).toHaveTextContent("Maria Souza")
        expect(items[0]).toHaveTextContent("30/10 às 10:00")
        expect(items[1]).toHaveTextContent("31/10 às 14:30")
        expect(
            within(dialog).getByRole("radio", { name: "Voltar para Pendente sem responsável" })
        ).toBeChecked()
        expect(
            within(dialog).getByText(
                "A mudança fica registrada no histórico de cada agendamento ao salvar."
            )
        ).toBeInTheDocument()
        expect(callsTo("GET", "/api/v1/users/7/future-appointments")).toHaveLength(1)
        expect(brunoRow()).toHaveTextContent("Ativo")
        expect(brunoRow()).not.toHaveTextContent("Não salvo")
    })

    it("lista como destino só as outras contas ativas que gerenciam agendamentos ou são Admin", async () => {
        const { user } = await openBruno()

        await user.click(screen.getByRole("button", { name: "Desativar conta" }))

        const select = await screen.findByRole("combobox", {
            name: "Funcionário que recebe os agendamentos"
        })
        expect(
            within(select)
                .getAllByRole("option")
                .map((option) => option.textContent)
        ).toEqual(["Ana Paula Souza"])
    })

    it("deixa Atribuir indisponível quando ninguém mais pode atender", async () => {
        const [, bruno, carla] = USERS_FIXTURE.items
        const { user } = await openBruno(undefined, { items: [bruno, carla], lastChange: null })

        await user.click(screen.getByRole("button", { name: "Desativar conta" }))

        expect(
            await screen.findByText("Nenhuma outra conta ativa tem Gerenciar agendamentos.")
        ).toBeInTheDocument()
        expect(screen.getByRole("radio", { name: "Atribuir a outro funcionário" })).toBeDisabled()
    })

    it("leva a desativação e a atribuição ao rascunho e ao PATCH", async () => {
        const { user, callsTo } = await openBruno()
        await user.click(screen.getByRole("button", { name: "Desativar conta" }))
        await user.click(await screen.findByRole("radio", { name: "Atribuir a outro funcionário" }))

        await user.click(screen.getByRole("button", { name: "Continuar" }))

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
        expect(brunoRow()).toHaveTextContent("Inativo")
        expect(brunoRow()).toHaveTextContent("Não salvo")
        expect(screen.getByRole("button", { name: "Reativar conta" })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "1 alteração não salva" })).toBeInTheDocument()
        expect(await pendingList(user)).toBe(
            "Pendentes: Bruno Lima: desativar conta (2 agendamento(s) redistribuído(s))"
        )
        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))
        await vi.waitFor(() => expect(callsTo("PATCH", "/api/v1/users")).toHaveLength(1))
        expect(callsTo("PATCH", "/api/v1/users")[0].body).toEqual({
            changes: [{ userId: 7, active: false, reassignment: { mode: "assign", toUserId: 1 } }]
        })
    })

    it("envia Voltar para Pendente ao tirar Gerenciar agendamentos, no singular", async () => {
        const { user, callsTo } = await openBruno(() => ({
            status: 200,
            body: { data: [TWO_APPOINTMENTS[0]] }
        }))
        await user.click(screen.getByRole("checkbox", { name: /^Gerenciar agendamentos/ }))

        const dialog = await screen.findByRole("dialog", {
            name: "Esta conta é responsável por 1 agendamento futuro"
        })
        expect(dialog).toHaveAccessibleDescription(
            "Bruno Lima perderá a permissão Gerenciar agendamentos. Escolha o que acontece com este agendamento. A mudança só vale ao salvar."
        )
        await user.click(screen.getByRole("button", { name: "Continuar" }))
        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

        await vi.waitFor(() => expect(callsTo("PATCH", "/api/v1/users")).toHaveLength(1))
        expect(callsTo("PATCH", "/api/v1/users")[0].body).toEqual({
            changes: [
                { userId: 7, permissions: ["appointments.view"], reassignment: { mode: "pending" } }
            ]
        })
    })

    it("aplica a mudança sem janela quando não há agendamentos futuros", async () => {
        const { user, callsTo } = await openBruno(() => ({ status: 200, body: { data: [] } }))

        await user.click(screen.getByRole("button", { name: "Desativar conta" }))

        expect(await screen.findByRole("button", { name: "Reativar conta" })).toBeInTheDocument()
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
        expect(brunoRow()).toHaveTextContent("Inativo")
        expect(callsTo("GET", "/api/v1/users/7/future-appointments")).toHaveLength(1)
    })

    it("não muda nada ao voltar e busca a lista de novo na próxima vez", async () => {
        const { user, callsTo } = await openBruno()
        await user.click(screen.getByRole("button", { name: "Desativar conta" }))
        await user.click(await screen.findByRole("button", { name: "Voltar" }))

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
        expect(brunoRow()).toHaveTextContent("Ativo")
        expect(brunoRow()).not.toHaveTextContent("Não salvo")
        await user.click(screen.getByRole("button", { name: "Desativar conta" }))
        expect(await screen.findByRole("dialog")).toBeInTheDocument()
        expect(callsTo("GET", "/api/v1/users/7/future-appointments")).toHaveLength(2)
    })

    it("não abre a janela de novo para a conta que já tem redistribuição", async () => {
        const { user, callsTo } = await openBruno()
        await user.click(screen.getByRole("checkbox", { name: /^Gerenciar agendamentos/ }))
        await user.click(await screen.findByRole("button", { name: "Continuar" }))

        await user.click(screen.getByRole("button", { name: "Desativar conta" }))

        expect(screen.getByRole("button", { name: "Reativar conta" })).toBeInTheDocument()
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
        expect(callsTo("GET", "/api/v1/users/7/future-appointments")).toHaveLength(1)
        expect(await pendingList(user)).toBe(
            "Pendentes: Bruno Lima: desativar conta; Bruno Lima: remover Gerenciar agendamentos (2 agendamento(s) redistribuído(s))"
        )
    })

    it("tira a redistribuição quando a conta volta a poder atender", async () => {
        const { user } = await openBruno()
        await user.click(screen.getByRole("checkbox", { name: /^Gerenciar agendamentos/ }))
        await user.click(await screen.findByRole("button", { name: "Continuar" }))
        await user.click(screen.getByRole("checkbox", { name: /^Ver relatórios/ }))

        await user.click(screen.getByRole("checkbox", { name: /^Gerenciar agendamentos/ }))

        expect(await pendingList(user)).toBe("Pendentes: Bruno Lima: conceder Ver relatórios")
    })

    it("descarta a redistribuição junto com o rascunho", async () => {
        const { user, callsTo } = await openBruno()
        await user.click(screen.getByRole("button", { name: "Desativar conta" }))
        await user.click(await screen.findByRole("button", { name: "Continuar" }))

        await user.click(screen.getByRole("button", { name: "Descartar" }))
        await user.click(screen.getByRole("button", { name: "Desativar conta" }))

        expect(await screen.findByRole("dialog")).toBeInTheDocument()
        expect(callsTo("GET", "/api/v1/users/7/future-appointments")).toHaveLength(2)
    })

    it("mostra o erro e não muda o rascunho quando a consulta falha", async () => {
        const { user } = await openBruno(() => ({
            status: 500,
            body: { error: { code: "INTERNAL_ERROR", message: "x" } }
        }))

        await user.click(screen.getByRole("button", { name: "Desativar conta" }))

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Não foi possível consultar os agendamentos futuros da conta. Tente de novo."
        )
        expect(brunoRow()).toHaveTextContent("Ativo")
        expect(brunoRow()).not.toHaveTextContent("Não salvo")
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
})
