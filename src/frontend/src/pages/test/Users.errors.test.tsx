import { screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import renderUsersPage from "@/testUtils/renderUsersPage"
import USERS_FIXTURE from "@/testUtils/usersFixture"

vi.setConfig({ testTimeout: 20000 })

type Reply = { status: number; body?: unknown }

const SERVER_MESSAGE = "mensagem interna do servidor"

afterEach(() => {
    vi.unstubAllGlobals()
})

function apiError(status: number, code: string, details?: Record<string, unknown>): () => Reply {
    return () => ({ status, body: { error: { code, message: SERVER_MESSAGE, details } } })
}

async function saveWith(
    patch: () => Reply | Promise<Reply>,
    handlers: Record<string, () => Reply | Promise<Reply>> = {}
) {
    const page = await renderUsersPage({
        list: USERS_FIXTURE,
        handlers: {
            "PATCH /api/v1/users": patch,
            "GET /api/v1/users/7/future-appointments": () => ({ status: 200, body: { data: [] } }),
            ...handlers
        }
    })
    await page.user.click(await screen.findByRole("button", { name: /Carla Dias/ }))
    await page.user.click(screen.getByRole("checkbox", { name: /^Ver relatórios/ }))
    await page.user.click(screen.getByRole("button", { name: /Bruno Lima/ }))
    await page.user.click(screen.getByRole("button", { name: "Desativar conta" }))
    await screen.findByRole("button", { name: "Reativar conta" })
    await page.user.click(screen.getByRole("button", { name: /Diego Rocha/ }))
    await page.user.click(screen.getByRole("button", { name: "Salvar alterações" }))

    return page
}

describe("UsersPage erros da API", () => {
    it("seleciona a conta do erro, mostra a mensagem com o nome e mantém o rascunho", async () => {
        await saveWith(apiError(403, "PERMISSION_NOT_HELD", { userId: 3 }))

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Carla Dias: você não pode conceder nem remover uma permissão que não tem."
        )
        expect(screen.getByRole("button", { name: /Carla Dias/ })).toHaveAttribute(
            "aria-pressed",
            "true"
        )
        expect(screen.getByRole("button", { name: /Carla Dias/ })).toHaveTextContent("Não salvo")
        expect(screen.getByRole("button", { name: /Bruno Lima/ })).toHaveTextContent("Não salvo")
        expect(screen.getByRole("button", { name: "2 alterações não salvas" })).toBeInTheDocument()
        expect(screen.queryByText(SERVER_MESSAGE)).not.toBeInTheDocument()
    })

    it("cita o protocolo e o protocolo em conflito no REASSIGNMENT_TARGET_BUSY", async () => {
        await saveWith(
            apiError(409, "REASSIGNMENT_TARGET_BUSY", {
                userId: 7,
                toUserId: 1,
                protocol: "AB12CD34",
                conflictingProtocol: "EF56GH78"
            })
        )

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "O funcionário escolhido já tem um agendamento no horário do protocolo AB12CD34 (conflito com EF56GH78). Escolha outro ou volte para Pendente."
        )
        expect(screen.getByRole("button", { name: /Bruno Lima/ })).toHaveAttribute(
            "aria-pressed",
            "true"
        )
    })

    it("reabre a janela de redistribuição no REASSIGNMENT_REQUIRED e envia a escolha", async () => {
        let futureCalls = 0
        let patchCalls = 0
        const { user, callsTo } = await saveWith(
            () => {
                patchCalls += 1

                return patchCalls === 1
                    ? apiError(409, "REASSIGNMENT_REQUIRED", { userId: 7 })()
                    : { status: 200, body: { data: { ...USERS_FIXTURE, redistributed: 1 } } }
            },
            {
                "GET /api/v1/users/7/future-appointments": () => {
                    futureCalls += 1

                    return {
                        status: 200,
                        body: {
                            data:
                                futureCalls === 1
                                    ? []
                                    : [
                                          {
                                              id: "11",
                                              protocol: "AB12CD34",
                                              name: "Maria Souza",
                                              appointmentDatetime: "2026-10-30T13:00:00.000Z",
                                              status: "CONFIRMED"
                                          }
                                      ]
                        }
                    }
                }
            }
        )

        expect(
            await screen.findByRole("dialog", {
                name: "Esta conta é responsável por 1 agendamento futuro"
            })
        ).toHaveAccessibleDescription(
            "Bruno Lima será desativada. Escolha o que acontece com este agendamento. A mudança só vale ao salvar."
        )
        expect(screen.getByRole("alert")).toHaveTextContent(
            "Bruno Lima passou a ter agendamentos futuros. Escolha o que acontece com eles."
        )
        await user.click(screen.getByRole("button", { name: "Continuar" }))
        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))
        await vi.waitFor(() => expect(callsTo("PATCH", "/api/v1/users")).toHaveLength(2))
        expect(callsTo("PATCH", "/api/v1/users")[1].body).toEqual({
            changes: [
                { userId: 3, permissions: ["appointments.view", "reports.view", "users.manage"] },
                { userId: 7, active: false, reassignment: { mode: "pending" } }
            ]
        })
    })

    it.each([
        [
            409,
            "INVALID_REASSIGNMENT_TARGET",
            "Bruno Lima: o funcionário escolhido para receber os agendamentos não pode mais atendê-los. Escolha outro."
        ],
        [404, "NOT_FOUND", "A conta não foi encontrada. Recarregue a página."],
        [403, "ADMIN_ACCOUNT_LOCKED", "A conta Admin não pode ser alterada pelo painel."],
        [
            403,
            "SELF_ACCOUNT_LOCKED",
            "Você não pode alterar a própria conta. Peça a outro usuário com a permissão Gerenciar usuários."
        ],
        [403, "TARGET_HAS_MORE_PERMISSIONS", "Esta conta tem permissões que você não possui."]
    ])("mostra a mensagem do %i %s", async (status, code, message) => {
        await saveWith(apiError(status, code, { userId: 7 }))

        expect(await screen.findByRole("alert")).toHaveTextContent(message)
    })

    it.each([
        [
            403,
            "INVALID_ORIGIN",
            "O painel foi aberto por um endereço não autorizado. Acesse pelo endereço oficial do painel."
        ],
        [403, "FORBIDDEN", "Você não tem mais permissão para gerenciar usuários."],
        [400, "BAD_REQUEST", "As alterações não foram aceitas. Descarte e tente de novo."],
        [500, "INTERNAL_ERROR", "Não foi possível salvar as alterações. Tente de novo."]
    ])(
        "mostra a mensagem própria do %i %s, sem o texto do servidor",
        async (status, code, message) => {
            await saveWith(apiError(status, code))

            expect(await screen.findByRole("alert")).toHaveTextContent(message)
            expect(screen.queryByText(SERVER_MESSAGE)).not.toBeInTheDocument()
        }
    )

    it("não mostra mensagem própria no 401", async () => {
        const { callsTo } = await saveWith(apiError(401, "UNAUTHORIZED"))

        await vi.waitFor(() => expect(callsTo("PATCH", "/api/v1/users").length).toBeGreaterThan(0))
        await vi.waitFor(() =>
            expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeEnabled()
        )

        expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    })
})
