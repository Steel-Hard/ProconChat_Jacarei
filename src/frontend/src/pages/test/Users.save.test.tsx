import { screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import renderUsersPage from "@/testUtils/renderUsersPage"
import USERS_FIXTURE from "@/testUtils/usersFixture"
import type UserAccountList from "@/types/users/UserAccountList.types"

vi.setConfig({ testTimeout: 20000 })

type Reply = { status: number; body?: unknown }

afterEach(() => {
    vi.unstubAllGlobals()
})

function savedList(redistributed = 0) {
    const [admin, bruno, carla, diego] = USERS_FIXTURE.items

    return {
        items: [
            admin,
            bruno,
            { ...carla, permissions: ["users.manage", "appointments.view", "reports.view"] },
            diego
        ],
        lastChange: { name: "Ana Paula Souza", at: "2026-10-21T15:00:00.000Z" },
        redistributed
    }
}

async function renderWith(
    patch: () => Reply | Promise<Reply> = () => ({ status: 200, body: { data: savedList() } }),
    list: UserAccountList = USERS_FIXTURE
) {
    const page = await renderUsersPage({ list, handlers: { "PATCH /api/v1/users": patch } })
    await screen.findByRole("list", { name: "Contas" })

    return page
}

function panelOf(name: string): HTMLElement {
    return screen.getByRole("region", { name })
}

function checkbox(name: string): HTMLElement {
    return screen.getByRole("checkbox", { name: new RegExp(`^${name}`) })
}

async function showPending(
    user: ReturnType<typeof import("@testing-library/user-event").default.setup>
): Promise<string> {
    const chip = screen.getByRole("button", { name: /alteraç(ão|ões) não salvas?/ })
    await user.hover(chip)

    return screen.getByRole("tooltip").textContent ?? ""
}

describe("UsersPage salvar em lote", () => {
    it("guarda a permissão marcada só no rascunho, com Não salvo e a barra", async () => {
        const { user, callsTo } = await renderWith()
        await user.click(screen.getByRole("button", { name: /Carla Dias/ }))

        await user.click(checkbox("Ver relatórios"))

        expect(checkbox("Ver relatórios")).toBeChecked()
        expect(screen.getByRole("button", { name: /Carla Dias/ })).toHaveTextContent("Não salvo")
        expect(screen.getByRole("button", { name: /Carla Dias/ })).toHaveTextContent(
            "3 de 8 permissões"
        )
        expect(screen.getByRole("button", { name: "1 alteração não salva" })).toBeInTheDocument()
        expect(await showPending(user)).toBe("Pendentes: Carla Dias: conceder Ver relatórios")
        expect(callsTo("PATCH", "/api/v1/users")).toHaveLength(0)
    })

    it("marca Ver agendamentos junto com Gerenciar e desmarca Gerenciar junto com Ver", async () => {
        const { user } = await renderWith()
        await user.click(screen.getByRole("button", { name: /Diego Rocha/ }))

        await user.click(checkbox("Gerenciar agendamentos"))
        const viewAfterManage = (checkbox("Ver agendamentos") as HTMLInputElement).checked
        await user.click(checkbox("Ver agendamentos"))

        expect(viewAfterManage).toBe(true)
        expect(checkbox("Gerenciar agendamentos")).not.toBeChecked()
        expect(checkbox("Ver agendamentos")).not.toBeChecked()
        expect(screen.getByRole("button", { name: /Diego Rocha/ })).not.toHaveTextContent(
            "Não salvo"
        )
    })

    it("lista conceder, remover, desativar e reativar na barra", async () => {
        const { user } = await renderWith()
        await user.click(screen.getByRole("button", { name: /Carla Dias/ }))
        await user.click(checkbox("Gerenciar usuários"))
        await user.click(screen.getByRole("button", { name: /Diego Rocha/ }))
        await user.click(screen.getByRole("button", { name: "Reativar conta" }))
        await user.click(checkbox("Ver sessões"))

        expect(screen.getByRole("button", { name: /Diego Rocha/ })).toHaveTextContent("Ativo")
        expect(await showPending(user)).toBe(
            "Pendentes: Carla Dias: remover Gerenciar usuários; Diego Rocha: reativar conta; Diego Rocha: conceder Ver sessões"
        )
        expect(screen.getByRole("button", { name: "3 alterações não salvas" })).toBeInTheDocument()
    })

    it("tira da contagem a mudança desfeita", async () => {
        const { user } = await renderWith()
        await user.click(screen.getByRole("button", { name: /Carla Dias/ }))
        await user.click(checkbox("Ver relatórios"))
        await user.click(checkbox("Ver sessões"))

        await user.click(checkbox("Ver relatórios"))

        expect(screen.getByRole("button", { name: "1 alteração não salva" })).toBeInTheDocument()
        await user.click(checkbox("Ver sessões"))
        expect(screen.queryByRole("button", { name: /não salva/ })).not.toBeInTheDocument()
        expect(screen.getByRole("button", { name: /Carla Dias/ })).not.toHaveTextContent(
            "Não salvo"
        )
    })

    it("apaga todo o rascunho ao descartar", async () => {
        const { user } = await renderWith()
        await user.click(screen.getByRole("button", { name: /Carla Dias/ }))
        await user.click(checkbox("Ver relatórios"))

        await user.click(screen.getByRole("button", { name: "Descartar" }))

        expect(checkbox("Ver relatórios")).not.toBeChecked()
        expect(screen.queryByText("Não salvo")).not.toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeDisabled()
    })

    it("envia um único PATCH com o conjunto final e só o que mudou, em ordem de userId", async () => {
        const { user, callsTo } = await renderWith()
        await user.click(screen.getByRole("button", { name: /Diego Rocha/ }))
        await user.click(screen.getByRole("button", { name: "Reativar conta" }))
        await user.click(screen.getByRole("button", { name: /Carla Dias/ }))
        await user.click(checkbox("Ver relatórios"))

        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

        await vi.waitFor(() => expect(callsTo("PATCH", "/api/v1/users")).toHaveLength(1))
        expect(callsTo("PATCH", "/api/v1/users")[0].body).toEqual({
            changes: [
                { userId: 3, permissions: ["appointments.view", "reports.view", "users.manage"] },
                { userId: 9, active: true }
            ]
        })
    })

    it("depois de salvar, troca a lista pela resposta, limpa o rascunho e avisa", async () => {
        const { user, callsTo } = await renderWith()
        await user.click(screen.getByRole("button", { name: /Carla Dias/ }))
        await user.click(checkbox("Ver relatórios"))

        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

        expect(await screen.findByText("Alterações de usuários salvas.")).toBeInTheDocument()
        expect(
            screen.getByText("Última alteração por Ana Paula Souza em 21/10/2026")
        ).toBeInTheDocument()
        expect(screen.queryByText("Não salvo")).not.toBeInTheDocument()
        expect(
            within(panelOf("Carla Dias")).getByRole("checkbox", { name: /^Ver relatórios/ })
        ).toBeChecked()
        expect(callsTo("GET", "/api/v1/users")).toHaveLength(1)
    })

    it("avisa quantos agendamentos foram redistribuídos e atualiza os agendamentos", async () => {
        const { user, store, callsTo } = await renderUsersPage({
            list: USERS_FIXTURE,
            handlers: {
                "PATCH /api/v1/users": () => ({ status: 200, body: { data: savedList(2) } }),
                "GET /api/v1/appointments/pending-count": () => ({
                    status: 200,
                    body: { data: { count: 3 } }
                })
            }
        })
        const { default: appointmentsApi } = await import("@/store/api/appointments.api")
        const subscription = store.dispatch(
            appointmentsApi.endpoints.getPendingAppointmentsCount.initiate()
        )
        await subscription
        await user.click(await screen.findByRole("button", { name: /Carla Dias/ }))
        await user.click(checkbox("Ver relatórios"))

        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

        expect(
            await screen.findByText("Alterações de usuários salvas. 2 agendamentos redistribuídos.")
        ).toBeInTheDocument()
        await vi.waitFor(() =>
            expect(callsTo("GET", "/api/v1/appointments/pending-count")).toHaveLength(2)
        )
        subscription.unsubscribe()
    })

    it("não atualiza os agendamentos quando nada foi redistribuído", async () => {
        const { user, store, callsTo } = await renderUsersPage({
            list: USERS_FIXTURE,
            handlers: {
                "PATCH /api/v1/users": () => ({ status: 200, body: { data: savedList(0) } }),
                "GET /api/v1/appointments/pending-count": () => ({
                    status: 200,
                    body: { data: { count: 3 } }
                })
            }
        })
        const { default: appointmentsApi } = await import("@/store/api/appointments.api")
        const subscription = store.dispatch(
            appointmentsApi.endpoints.getPendingAppointmentsCount.initiate()
        )
        await subscription
        await user.click(await screen.findByRole("button", { name: /Carla Dias/ }))
        await user.click(checkbox("Ver relatórios"))

        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

        expect(await screen.findByText("Alterações de usuários salvas.")).toBeInTheDocument()
        expect(callsTo("GET", "/api/v1/appointments/pending-count")).toHaveLength(1)
        subscription.unsubscribe()
    })

    it("usa o singular com um agendamento redistribuído", async () => {
        const { user } = await renderWith(() => ({ status: 200, body: { data: savedList(1) } }))
        await user.click(screen.getByRole("button", { name: /Carla Dias/ }))
        await user.click(checkbox("Ver relatórios"))

        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

        expect(
            await screen.findByText("Alterações de usuários salvas. 1 agendamento redistribuído.")
        ).toBeInTheDocument()
    })

    it("não envia outro PATCH enquanto o salvamento está em andamento", async () => {
        const pending = Promise.withResolvers<Reply>()
        const { user, callsTo } = await renderWith(() => pending.promise)
        await user.click(screen.getByRole("button", { name: /Carla Dias/ }))
        await user.click(checkbox("Ver relatórios"))
        const save = screen.getByRole("button", { name: "Salvar alterações" })

        await user.click(save)
        await user.click(save)

        expect(save).toHaveAttribute("aria-busy", "true")
        expect(save).toBeDisabled()
        expect(callsTo("PATCH", "/api/v1/users")).toHaveLength(1)
        pending.resolve({ status: 200, body: { data: savedList() } })
        expect(await screen.findByText("Alterações de usuários salvas.")).toBeInTheDocument()
    })
})
