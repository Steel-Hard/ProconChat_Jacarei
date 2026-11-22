import { screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import buildScheduleConfig from "@/testUtils/buildScheduleConfig"
import renderSchedulePage from "@/testUtils/renderSchedulePage"
import type PanelAccount from "@/types/account/PanelAccount.types"

vi.setConfig({ testTimeout: 60000 })

const CONFLICTS = [
    {
        id: "41",
        protocol: "E5F6A7B8",
        name: "Maria Souza",
        cpfMasked: "***.982.247-**",
        appointmentDatetime: "2026-11-05T12:00:00.000Z",
        date: "2026-11-05",
        time: "09:00",
        status: "PENDING",
        code: "SEATS_REDUCED",
        reason: "Vagas reduzidas para 1"
    },
    {
        id: "42",
        protocol: "C9D0E1F2",
        name: "João Silva",
        cpfMasked: "***.111.222-**",
        appointmentDatetime: "2026-11-05T12:30:00.000Z",
        date: "2026-11-05",
        time: "09:30",
        status: "CONFIRMED",
        code: "SEATS_REDUCED",
        reason: "Vagas reduzidas para 1"
    }
]

const SCHEDULE_ONLY_ACCOUNT: PanelAccount = {
    id: 2,
    name: "Carlos Lima",
    email: "carlos@exemplo.gov.br",
    isAdmin: false,
    permissions: ["schedule.configure"]
}

const MANAGER_ACCOUNT: PanelAccount = {
    id: 3,
    name: "Patrícia Reis",
    email: "patricia@exemplo.gov.br",
    isAdmin: false,
    permissions: ["schedule.configure", "appointments.manage"]
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
})

async function triggerConflictModal(user: Awaited<ReturnType<typeof renderSchedulePage>>["user"]) {
    await screen.findByRole("checkbox", { name: "Segunda-feira" })
    const input = screen.getByLabelText("Vagas simultâneas por horário")
    await user.clear(input)
    await user.type(input, "1")
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }))
    return screen.findByRole("dialog", { name: "Esta alteração afeta 2 agendamentos" })
}

describe("SchedulePage: modal de conflitos", () => {
    it("sem permissão de agendamentos mostra só Manter e Voltar sem salvar", async () => {
        const { user, callsTo } = await renderSchedulePage({
            account: SCHEDULE_ONLY_ACCOUNT,
            handlers: {
                "PUT /api/v1/schedule": ({ body }) => {
                    const payload = body as { conflictResolution?: string }
                    if (!payload.conflictResolution) {
                        return {
                            status: 409,
                            body: {
                                error: {
                                    code: "SCHEDULE_CONFLICTS",
                                    message: "x",
                                    details: { conflicts: CONFLICTS }
                                }
                            }
                        }
                    }
                    return {
                        status: 200,
                        body: {
                            data: buildScheduleConfig({ seatsPerSlot: 1 }),
                            resolution: {
                                action: "KEEP",
                                affectedCount: 2,
                                notifiedCount: 0,
                                failedCount: 0,
                                noticeDisabled: false
                            }
                        }
                    }
                }
            }
        })

        const dialog = await triggerConflictModal(user)
        expect(
            within(dialog).getByRole("button", { name: "Manter os agendamentos" })
        ).toBeInTheDocument()
        expect(
            within(dialog).getByRole("button", { name: "← Voltar sem salvar" })
        ).toBeInTheDocument()
        expect(within(dialog).queryByRole("button", { name: /Cancelar/ })).not.toBeInTheDocument()
        expect(callsTo("GET", "/api/v1/schedule/cancellation-notice")).toHaveLength(0)

        await user.click(within(dialog).getByRole("button", { name: "Manter os agendamentos" }))

        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
        expect(
            screen.getByText(
                'Alteração salva. 2 agendamentos mantidos com o selo "Fora da grade atual".'
            )
        ).toBeInTheDocument()
        expect(callsTo("PUT", "/api/v1/schedule")[1]?.body).toMatchObject({
            conflictResolution: "KEEP"
        })
    })

    it("com aviso ligado e problema conhecido na Meta mostra faixa, texto de custo e permite cancelar", async () => {
        const { user, callsTo } = await renderSchedulePage({
            account: MANAGER_ACCOUNT,
            handlers: {
                "GET /api/v1/schedule/cancellation-notice": () => ({
                    status: 200,
                    body: {
                        data: {
                            enabled: true,
                            problem: {
                                code: "PAYMENT_METHOD",
                                at: "2026-11-01T10:00:00.000Z"
                            }
                        }
                    }
                }),
                "PUT /api/v1/schedule": ({ body }) => {
                    const payload = body as { conflictResolution?: string }
                    if (!payload.conflictResolution) {
                        return {
                            status: 409,
                            body: {
                                error: {
                                    code: "SCHEDULE_CONFLICTS",
                                    message: "x",
                                    details: { conflicts: CONFLICTS }
                                }
                            }
                        }
                    }
                    return {
                        status: 200,
                        body: {
                            data: buildScheduleConfig({ seatsPerSlot: 1 }),
                            resolution: {
                                action: "CANCEL",
                                affectedCount: 2,
                                notifiedCount: 0,
                                failedCount: 2,
                                noticeDisabled: false
                            }
                        }
                    }
                }
            }
        })

        const dialog = await triggerConflictModal(user)
        expect(
            await within(dialog).findByText(
                "O aviso pode não chegar: a conta da Meta está sem forma de pagamento."
            )
        ).toBeInTheDocument()
        expect(
            within(dialog).getByText(
                "2 cidadãos receberão um aviso por WhatsApp. Cada aviso é uma mensagem de modelo e tem custo por mensagem cobrado pela Meta."
            )
        ).toBeInTheDocument()

        const cancelButton = within(dialog).getByRole("button", {
            name: "Cancelar e avisar os cidadãos"
        })
        expect(cancelButton).toBeEnabled()
        await user.click(cancelButton)

        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
        expect(
            screen.getByText("2 agendamentos cancelados. 2 avisos falharam.")
        ).toBeInTheDocument()
        expect(callsTo("PUT", "/api/v1/schedule")[1]?.body).toMatchObject({
            conflictResolution: "CANCEL"
        })
    })

    it("com aviso desligado mostra botão Cancelar agendamentos e aviso de outro meio", async () => {
        const { user } = await renderSchedulePage({
            account: MANAGER_ACCOUNT,
            handlers: {
                "GET /api/v1/schedule/cancellation-notice": () => ({
                    status: 200,
                    body: { data: { enabled: false, problem: null } }
                }),
                "PUT /api/v1/schedule": () => ({
                    status: 409,
                    body: {
                        error: {
                            code: "SCHEDULE_CONFLICTS",
                            message: "x",
                            details: { conflicts: CONFLICTS }
                        }
                    }
                })
            }
        })

        const dialog = await triggerConflictModal(user)
        expect(
            await within(dialog).findByText(
                "2 cidadãos não serão avisados pelo sistema. A equipe precisa avisar por outro meio."
            )
        ).toBeInTheDocument()
        expect(within(dialog).getByRole("button", { name: "Cancelar agendamentos" })).toBeEnabled()
    })

    it("quando a configuração do aviso falha bloqueia cancelar e permite tentar de novo", async () => {
        let attempts = 0
        const { user } = await renderSchedulePage({
            account: MANAGER_ACCOUNT,
            handlers: {
                "GET /api/v1/schedule/cancellation-notice": () => {
                    attempts += 1
                    if (attempts === 1) {
                        return {
                            status: 500,
                            body: { error: { code: "INTERNAL_ERROR", message: "x" } }
                        }
                    }
                    return {
                        status: 200,
                        body: { data: { enabled: false, problem: null } }
                    }
                },
                "PUT /api/v1/schedule": () => ({
                    status: 409,
                    body: {
                        error: {
                            code: "SCHEDULE_CONFLICTS",
                            message: "x",
                            details: { conflicts: CONFLICTS }
                        }
                    }
                })
            }
        })

        const dialog = await triggerConflictModal(user)
        expect(
            await within(dialog).findByText(
                "Não foi possível verificar o aviso ao cidadão. Tente de novo."
            )
        ).toBeInTheDocument()
        expect(
            within(dialog).queryByRole("button", { name: "Cancelar agendamentos" })
        ).not.toBeInTheDocument()

        await user.click(within(dialog).getByRole("button", { name: "Tentar de novo" }))

        await waitFor(() =>
            expect(
                within(dialog).getByRole("button", { name: "Cancelar agendamentos" })
            ).toBeEnabled()
        )
    })
})
