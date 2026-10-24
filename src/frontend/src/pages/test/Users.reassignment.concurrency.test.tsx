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

    it("bloqueia as permissões e o Desativar conta enquanto a consulta não responde", async () => {
        const pending = Promise.withResolvers<Reply>()
        const { user } = await renderUsersPage({
            list: USERS_FIXTURE,
            handlers: { [FUTURE_PATH]: () => pending.promise }
        })
        await user.click(await screen.findByRole("button", { name: /Bruno Lima/ }))

        await user.click(screen.getByRole("button", { name: "Desativar conta" }))

        expect(screen.getByRole("checkbox", { name: /^Ver relatórios/ })).toBeDisabled()
        expect(screen.getByRole("button", { name: "Desativar conta" })).toBeDisabled()
        pending.resolve({ status: 200, body: { data: [] } })
        expect(await screen.findByRole("button", { name: "Reativar conta" })).toBeEnabled()
        expect(screen.getByRole("checkbox", { name: /^Ver relatórios/ })).toBeEnabled()
    })

    it("não salva enquanto a consulta dos agendamentos futuros não responde", async () => {
        const pending = Promise.withResolvers<Reply>()
        const { user, callsTo } = await renderUsersPage({
            list: USERS_FIXTURE,
            handlers: {
                [FUTURE_PATH]: () => pending.promise,
                "PATCH /api/v1/users": () => ({ status: 200, body: { data: USERS_FIXTURE } })
            }
        })
        await user.click(await screen.findByRole("button", { name: /Carla Dias/ }))
        await user.click(screen.getByRole("checkbox", { name: /^Ver relatórios/ }))
        await user.click(screen.getByRole("button", { name: /Bruno Lima/ }))
        await user.click(screen.getByRole("button", { name: "Desativar conta" }))

        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

        expect(callsTo("PATCH", "/api/v1/users")).toHaveLength(0)
        pending.resolve({ status: 200, body: { data: [] } })
        expect(await screen.findByRole("button", { name: "Reativar conta" })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "2 alterações não salvas" })).toBeInTheDocument()
    })

    it("não descarta enquanto a consulta dos agendamentos futuros não responde", async () => {
        const pending = Promise.withResolvers<Reply>()
        const { user } = await renderUsersPage({
            list: USERS_FIXTURE,
            handlers: { [FUTURE_PATH]: () => pending.promise }
        })
        await user.click(await screen.findByRole("button", { name: /Carla Dias/ }))
        await user.click(screen.getByRole("checkbox", { name: /^Ver relatórios/ }))
        await user.click(screen.getByRole("button", { name: /Bruno Lima/ }))
        await user.click(screen.getByRole("button", { name: "Desativar conta" }))

        await user.click(screen.getByRole("button", { name: "Descartar" }))

        expect(screen.getByRole("button", { name: "Descartar" })).toBeDisabled()
        pending.resolve({ status: 200, body: { data: [] } })
        expect(await screen.findByRole("button", { name: "Reativar conta" })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "2 alterações não salvas" })).toBeInTheDocument()
    })

    it("deixa Salvar desabilitado enquanto a consulta dos agendamentos futuros não responde", async () => {
        const pending = Promise.withResolvers<Reply>()
        const { user } = await renderUsersPage({
            list: USERS_FIXTURE,
            handlers: { [FUTURE_PATH]: () => pending.promise }
        })
        await user.click(await screen.findByRole("button", { name: /Carla Dias/ }))
        await user.click(screen.getByRole("checkbox", { name: /^Ver relatórios/ }))
        await user.click(screen.getByRole("button", { name: /Bruno Lima/ }))

        await user.click(screen.getByRole("button", { name: "Desativar conta" }))

        expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeDisabled()
        pending.resolve({ status: 200, body: { data: [] } })
        expect(await screen.findByRole("button", { name: "Reativar conta" })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeEnabled()
    })
})
