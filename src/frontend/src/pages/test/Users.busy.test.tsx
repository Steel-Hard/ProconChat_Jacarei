import { screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import renderUsersPage from "@/testUtils/renderUsersPage"
import USERS_FIXTURE from "@/testUtils/usersFixture"

vi.setConfig({ testTimeout: 20000 })

type Reply = { status: number; body?: unknown }

afterEach(() => {
    vi.unstubAllGlobals()
})

function savedList() {
    const [admin, bruno, carla, diego] = USERS_FIXTURE.items

    return {
        items: [
            admin,
            bruno,
            { ...carla, permissions: ["users.manage", "appointments.view", "reports.view"] },
            diego
        ],
        lastChange: { name: "Ana Paula Souza", at: "2026-10-21T15:00:00.000Z" },
        redistributed: 0
    }
}

function checkbox(name: string): HTMLElement {
    return screen.getByRole("checkbox", { name: new RegExp(`^${name}`) })
}

describe("UsersPage painel bloqueado durante o salvamento", () => {
    it("bloqueia as permissões e o Desativar conta enquanto o PATCH não responde", async () => {
        const pending = Promise.withResolvers<Reply>()
        const { user } = await renderUsersPage({
            list: USERS_FIXTURE,
            handlers: { "PATCH /api/v1/users": () => pending.promise }
        })
        await user.click(await screen.findByRole("button", { name: /Carla Dias/ }))
        await user.click(checkbox("Ver relatórios"))

        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

        expect(checkbox("Ver sessões")).toBeDisabled()
        expect(checkbox("Ver relatórios")).toBeDisabled()
        expect(screen.getByRole("button", { name: "Desativar conta" })).toBeDisabled()
        pending.resolve({ status: 200, body: { data: savedList() } })
        await vi.waitFor(() => expect(checkbox("Ver sessões")).toBeEnabled())
        expect(screen.getByRole("button", { name: "Desativar conta" })).toBeEnabled()
    })

    it("bloqueia o painel de outra conta escolhida durante o salvamento", async () => {
        const pending = Promise.withResolvers<Reply>()
        const { user } = await renderUsersPage({
            list: USERS_FIXTURE,
            handlers: { "PATCH /api/v1/users": () => pending.promise }
        })
        await user.click(await screen.findByRole("button", { name: /Carla Dias/ }))
        await user.click(checkbox("Ver relatórios"))
        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

        await user.click(screen.getByRole("button", { name: /Bruno Lima/ }))

        expect(checkbox("Ver relatórios")).toBeDisabled()
        expect(screen.getByRole("button", { name: "Desativar conta" })).toBeDisabled()
        pending.resolve({ status: 200, body: { data: savedList() } })
        await vi.waitFor(() => expect(checkbox("Ver relatórios")).toBeEnabled())
    })
})
