import { screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import renderUsersPage from "@/testUtils/renderUsersPage"
import USERS_FIXTURE from "@/testUtils/usersFixture"

vi.setConfig({ testTimeout: 20000 })

type Reply = { status: number; body?: unknown }

const FUTURE_PATH = "GET /api/v1/users/7/future-appointments"

const ONE_APPOINTMENT = [
    {
        id: "11",
        protocol: "AB12CD34",
        name: "Maria Souza",
        appointmentDatetime: "2026-10-30T13:00:00.000Z",
        status: "CONFIRMED"
    }
]

afterEach(() => {
    vi.unstubAllGlobals()
})

describe("UsersPage consulta dos agendamentos futuros em andamento", () => {
    it("consulta os agendamentos futuros uma só vez com dois cliques seguidos em Desativar conta", async () => {
        const pending = Promise.withResolvers<Reply>()
        const { user, callsTo } = await renderUsersPage({
            list: USERS_FIXTURE,
            handlers: { [FUTURE_PATH]: () => pending.promise }
        })
        await user.click(await screen.findByRole("button", { name: /Bruno Lima/ }))
        const deactivate = screen.getByRole("button", { name: "Desativar conta" })

        await user.click(deactivate)
        await user.click(deactivate)

        expect(callsTo("GET", "/api/v1/users/7/future-appointments")).toHaveLength(1)
        pending.resolve({ status: 200, body: { data: ONE_APPOINTMENT } })
        expect(
            await screen.findByRole("dialog", {
                name: "Esta conta é responsável por 1 agendamento futuro"
            })
        ).toBeInTheDocument()
    })
})
