import { screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import renderUsersPage from "@/testUtils/renderUsersPage"
import USERS_FIXTURE from "@/testUtils/usersFixture"
import type NavKey from "@/types/navigation/NavKey.types"

vi.setConfig({ testTimeout: 20000 })

const TODAY: Record<NavKey, boolean> = {
    dashboard: false,
    appointments: true,
    reports: false,
    content: false,
    sessions: false,
    schedule: false,
    documents: false,
    users: true,
    whatsapp: true
}

afterEach(() => {
    vi.unstubAllGlobals()
})

function rowOf(name: string): HTMLElement {
    return screen.getByRole("button", { name: new RegExp(name) })
}

async function renderToday(ready: Record<NavKey, boolean> = TODAY) {
    const page = await renderUsersPage({
        list: USERS_FIXTURE,
        ready,
        handlers: {
            "PATCH /api/v1/users": () => ({ status: 200, body: { data: USERS_FIXTURE } })
        }
    })
    await screen.findByRole("list", { name: "Contas" })

    return page
}

describe("UsersPage com só algumas telas prontas", () => {
    it("mostra só as permissões das telas prontas, na ordem", async () => {
        const { user } = await renderToday()

        await user.click(rowOf("Carla Dias"))

        const panel = screen.getByRole("region", { name: "Carla Dias" })
        const boxes = within(panel).getAllByRole("checkbox")
        const names = ["Ver agendamentos", "Gerenciar agendamentos", "Gerenciar usuários"]
        expect(boxes).toHaveLength(3)
        boxes.forEach((box, index) =>
            expect(box).toHaveAccessibleName(new RegExp(`^${names[index]}`))
        )
        ;[
            "Gerenciar conteúdo do chatbot",
            "Configurar atendimento presencial",
            "Configurar documentos para atendimento presencial",
            "Ver sessões",
            "Ver relatórios"
        ].forEach((name) =>
            expect(
                within(panel).queryByRole("checkbox", { name: new RegExp(`^${name}`) })
            ).not.toBeInTheDocument()
        )
    })

    it("mostra as permissões visíveis do Admin marcadas e desabilitadas", async () => {
        await renderToday()

        const panel = screen.getByRole("region", { name: /Ana Paula Souza/ })
        const boxes = within(panel).getAllByRole("checkbox")
        expect(boxes).toHaveLength(3)
        expect(
            boxes.every(
                (box) => (box as HTMLInputElement).checked && (box as HTMLInputElement).disabled
            )
        ).toBe(true)
    })

    it("conta na lista só as permissões das telas prontas", async () => {
        await renderToday()

        expect(rowOf("Ana Paula Souza")).toHaveTextContent("Todas as permissões")
        expect(rowOf("Bruno Lima")).toHaveTextContent("2 de 3 permissões")
        expect(rowOf("Carla Dias")).toHaveTextContent("2 de 3 permissões")
    })

    it("não conta na lista a permissão de tela não pronta que a conta já tem", async () => {
        await renderToday()

        expect(rowOf("Diego Rocha")).toHaveTextContent("0 de 3 permissões")
    })

    it("envia o conjunto completo da conta, com as permissões de telas não prontas", async () => {
        const { user, callsTo } = await renderToday()
        await user.click(rowOf("Diego Rocha"))
        await user.click(screen.getByRole("checkbox", { name: /^Gerenciar usuários/ }))

        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

        await vi.waitFor(() => expect(callsTo("PATCH", "/api/v1/users")).toHaveLength(1))
        expect(callsTo("PATCH", "/api/v1/users")[0].body).toEqual({
            changes: [{ userId: 9, permissions: ["reports.view", "users.manage"] }]
        })
    })

    it("não cria alteração só por abrir uma conta com permissão de tela não pronta", async () => {
        const { user, callsTo } = await renderToday()

        await user.click(rowOf("Diego Rocha"))

        expect(rowOf("Diego Rocha")).not.toHaveTextContent("Não salvo")
        expect(screen.queryByRole("button", { name: /não salva/ })).not.toBeInTheDocument()
        expect(callsTo("PATCH", "/api/v1/users")).toHaveLength(0)
    })

    it("mostra Ver relatórios quando a tela de Relatórios fica pronta", async () => {
        const { user } = await renderToday({ ...TODAY, reports: true })

        await user.click(rowOf("Carla Dias"))

        const panel = screen.getByRole("region", { name: "Carla Dias" })
        expect(within(panel).getAllByRole("checkbox")).toHaveLength(4)
        expect(within(panel).getByRole("checkbox", { name: /^Ver relatórios/ })).not.toBeChecked()
        expect(rowOf("Carla Dias")).toHaveTextContent("2 de 4 permissões")
    })
})
