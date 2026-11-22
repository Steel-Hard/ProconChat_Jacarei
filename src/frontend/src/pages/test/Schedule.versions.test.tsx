import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import buildScheduleConfig from "@/testUtils/buildScheduleConfig"
import renderSchedulePage from "@/testUtils/renderSchedulePage"

vi.setConfig({ testTimeout: 20000 })

const SLOW = { timeout: 10000 }
const CHANGE = "2026-11-10"
const LATER_CHANGE = "2026-12-01"
const VERSION = { ...buildScheduleConfig({ seatsPerSlot: 4 }), effectiveFrom: CHANGE }

type Handlers = NonNullable<Parameters<typeof renderSchedulePage>[0]>["handlers"]

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
})

function withVersions(handlers: Handlers = {}, dates: string[] = [CHANGE]) {
    return renderSchedulePage({
        handlers: {
            "GET /api/v1/schedule/versions": () => ({
                status: 200,
                body: {
                    data: dates.map((effectiveFrom) => ({
                        effectiveFrom,
                        config: { ...VERSION, effectiveFrom }
                    }))
                }
            }),
            "GET /api/v1/schedule/effective": () => ({ status: 200, body: { data: VERSION } }),
            ...handlers
        }
    })
}

async function formReady() {
    await screen.findByRole("checkbox", { name: "Segunda-feira" }, SLOW)
}

async function previewReady() {
    await waitFor(
        () =>
            expect(screen.getByLabelText("Valer a partir de")).toHaveAttribute("min", "2026-10-25"),
        SLOW
    )
}

function seatsField(): HTMLElement {
    return screen.getByLabelText("Vagas simultâneas por horário")
}

function cancelDialog(): HTMLElement {
    return screen.getByRole("dialog", {
        name: "Cancelar a mudança de horários a partir de 10/11/2026?"
    })
}

function resolutionOf(action: "KEEP" | "CANCEL") {
    return {
        action,
        affectedCount: 1,
        notifiedCount: 0,
        failedCount: 0,
        noticeDisabled: true
    }
}

async function openModal(user: Awaited<ReturnType<typeof withVersions>>["user"]) {
    await formReady()
    await user.click(
        await screen.findByRole("button", { name: "Cancelar a mudança de 10/11/2026" })
    )
    await user.click(within(cancelDialog()).getByRole("button", { name: "Cancelar mudança" }))

    return screen.findByRole(
        "dialog",
        { name: "Cancelar a mudança de 10/11 afeta 1 agendamento" },
        SLOW
    )
}

describe("SchedulePage: mudanças agendadas", () => {
    it("mostra desde quando vale a configuração de hoje quando ela é uma mudança já iniciada", async () => {
        await renderSchedulePage({
            handlers: {
                "GET /api/v1/schedule": () => ({
                    status: 200,
                    body: { data: { ...buildScheduleConfig(), effectiveFrom: "2026-10-01" } }
                })
            }
        })

        expect(await screen.findByText("Valendo desde 01/10/2026", {}, SLOW)).toBeInTheDocument()
        expect(screen.getByText("Editando a configuração que vale hoje")).toBeInTheDocument()
    })

    it("dá a cada botão da lista um nome com a data da mudança e avisa que cada uma tem cópia própria", async () => {
        await withVersions({}, [CHANGE, LATER_CHANGE])
        await formReady()

        await screen.findByRole("button", { name: "Editar a mudança de 10/11/2026" })

        expect(
            screen.getByRole("button", { name: "Cancelar a mudança de 10/11/2026" })
        ).toBeInTheDocument()
        expect(
            screen.getByRole("button", { name: "Editar a mudança de 01/12/2026" })
        ).toBeInTheDocument()
        expect(
            screen.getByRole("button", { name: "Cancelar a mudança de 01/12/2026" })
        ).toBeInTheDocument()
        expect(
            screen.getByText(
                "As mudanças agendadas têm cópia própria dos horários, das datas bloqueadas e do endereço."
            )
        ).toBeInTheDocument()
    })

    it("não mostra o aviso de cópia própria sem mudanças agendadas", async () => {
        await renderSchedulePage()
        await formReady()

        expect(screen.queryByText(/têm cópia própria/)).not.toBeInTheDocument()
    })

    it("não cancela quando a equipe volta no diálogo", async () => {
        const { user, callsTo } = await withVersions()
        await formReady()

        await user.click(
            await screen.findByRole("button", { name: "Cancelar a mudança de 10/11/2026" })
        )
        await user.click(within(cancelDialog()).getByRole("button", { name: "Voltar" }))

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
        expect(callsTo("DELETE", `/api/v1/schedule/versions/${CHANGE}`)).toEqual([])
    })

    it("avisa quando o cancelamento falha", async () => {
        const { user } = await withVersions({
            [`DELETE /api/v1/schedule/versions/${CHANGE}`]: () => ({
                status: 500,
                body: { error: { code: "INTERNAL_SERVER_ERROR", message: "x" } }
            })
        })
        await formReady()

        await user.click(
            await screen.findByRole("button", { name: "Cancelar a mudança de 10/11/2026" })
        )
        await user.click(within(cancelDialog()).getByRole("button", { name: "Cancelar mudança" }))

        expect(
            await screen.findByText("Não foi possível cancelar esta mudança de horários.", {}, SLOW)
        ).toBeInTheDocument()
    })

    describe("cancelar uma mudança que deixa agendamentos fora da configuração anterior", () => {
        const AFFECTED = {
            id: "7",
            protocol: "ABCD1234",
            name: "Maria Oliveira",
            cpfMasked: "***.456.789-**",
            date: "2026-11-14",
            time: "09:00",
            status: "CONFIRMED",
            code: "DAY_WITHOUT_SERVICE",
            reason: "Dia sem atendimento na nova grade"
        }

        const DELETE_PATH = `DELETE /api/v1/schedule/versions/${CHANGE}`

        function withConflicts(handlers: Handlers = {}) {
            return withVersions({
                [DELETE_PATH]: ({ body }) => {
                    const sent = body as { conflictResolution?: "KEEP" | "CANCEL" } | undefined

                    return sent?.conflictResolution
                        ? {
                              status: 200,
                              body: { resolution: resolutionOf(sent.conflictResolution) }
                          }
                        : {
                              status: 409,
                              body: {
                                  error: {
                                      code: "SCHEDULE_CONFLICTS",
                                      message: "x",
                                      details: { conflicts: [AFFECTED] }
                                  }
                              }
                          }
                },
                ...handlers
            })
        }

        it("abre o modal da origem cancelar mudança e não mostra a lista fora dele", async () => {
            const { user } = await withConflicts()

            const dialog = await openModal(user)

            expect(within(dialog).getByText(/ABCD1234/)).toBeInTheDocument()
            expect(screen.getAllByText(/ABCD1234/)).toHaveLength(1)
            expect(
                screen.queryByRole("region", { name: "Esta alteração afeta 1 agendamento" })
            ).not.toBeInTheDocument()
        })

        it("mantém os agendamentos enviando a resolução e os ids vistos", async () => {
            const { user, callsTo } = await withConflicts()

            const dialog = await openModal(user)
            await user.click(within(dialog).getByRole("button", { name: "Manter os agendamentos" }))

            await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
            const sent = callsTo("DELETE", `/api/v1/schedule/versions/${CHANGE}`)
            expect(sent[0]?.body).toBeUndefined()
            expect(sent[1]?.body).toEqual({ conflictResolution: "KEEP", seenConflictIds: ["7"] })
        })

        it("cancela os agendamentos enviando os ids vistos e o estado do aviso mostrado", async () => {
            const { user, callsTo } = await withConflicts({
                "GET /api/v1/schedule/cancellation-notice": () => ({
                    status: 200,
                    body: { data: { enabled: true, problem: null } }
                })
            })

            const dialog = await openModal(user)
            await user.click(
                await within(dialog).findByRole("button", {
                    name: "Cancelar a mudança, os agendamentos e avisar os cidadãos"
                })
            )

            await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
            expect(callsTo("DELETE", `/api/v1/schedule/versions/${CHANGE}`)[1]?.body).toEqual({
                conflictResolution: "CANCEL",
                seenConflictIds: ["7"],
                seenNoticeEnabled: true
            })
        })

        it("atualiza o modal quando a lista mudou e mostra a mensagem de atualização", async () => {
            const { user } = await withConflicts({
                [DELETE_PATH]: ({ body }) => {
                    const sent = body as { conflictResolution?: string } | undefined

                    if (!sent?.conflictResolution) {
                        return {
                            status: 409,
                            body: {
                                error: {
                                    code: "SCHEDULE_CONFLICTS",
                                    message: "x",
                                    details: { conflicts: [AFFECTED] }
                                }
                            }
                        }
                    }

                    return {
                        status: 409,
                        body: {
                            error: {
                                code: "SCHEDULE_CONFLICTS_CHANGED",
                                message: "x",
                                details: {
                                    conflicts: [
                                        AFFECTED,
                                        { ...AFFECTED, id: "8", protocol: "ZZZZ9999" }
                                    ],
                                    cancellationNotice: { enabled: false, problem: null },
                                    changes: ["CONFLICTS"]
                                }
                            }
                        }
                    }
                }
            })

            const dialog = await openModal(user)
            await user.click(within(dialog).getByRole("button", { name: "Manter os agendamentos" }))

            const refreshed = await screen.findByRole(
                "dialog",
                { name: "Cancelar a mudança de 10/11 afeta 2 agendamentos" },
                SLOW
            )
            expect(within(refreshed).getByText(/ZZZZ9999/)).toBeInTheDocument()
            expect(
                within(refreshed).getByText(
                    "A lista de agendamentos afetados ou o aviso ao cidadão mudou desde que você abriu esta janela. Confira antes de escolher."
                )
            ).toBeInTheDocument()
        })

        it("não cancela a mudança ao voltar sem cancelar", async () => {
            const { user, callsTo } = await withConflicts()

            const dialog = await openModal(user)
            await user.click(
                within(dialog).getByRole("button", { name: "← Voltar sem cancelar a mudança" })
            )

            expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
            expect(callsTo("DELETE", `/api/v1/schedule/versions/${CHANGE}`)).toHaveLength(1)
        })

        it("volta para a configuração de hoje quando a mudança cancelada estava aberta", async () => {
            const { user } = await withConflicts()
            await formReady()
            await user.click(
                await screen.findByRole("button", { name: "Editar a mudança de 10/11/2026" })
            )
            await waitFor(() => expect(seatsField()).toHaveValue(4), SLOW)

            const dialog = await openModal(user)
            await user.click(within(dialog).getByRole("button", { name: "Manter os agendamentos" }))

            await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
            expect(
                await screen.findByText("Editando a configuração que vale hoje")
            ).toBeInTheDocument()
            expect(screen.getByLabelText("Valer a partir de")).toHaveValue("")
        })
    })

    it("pede confirmação para trocar de versão com alterações pendentes e carrega a outra ao confirmar", async () => {
        const { user, callsTo } = await withVersions()
        await formReady()
        await user.clear(seatsField())
        await user.type(seatsField(), "3")

        await user.click(
            await screen.findByRole("button", { name: "Editar a mudança de 10/11/2026" })
        )
        const dialog = screen.getByRole("dialog", { name: "Descartar as alterações não salvas?" })
        await user.click(within(dialog).getByRole("button", { name: "Descartar" }))

        expect(
            await screen.findByText("Editando a configuração a partir de 10/11/2026", {}, SLOW)
        ).toBeInTheDocument()
        await waitFor(() => expect(seatsField()).toHaveValue(4), SLOW)
        expect(callsTo("GET", "/api/v1/schedule/effective")).not.toEqual([])
    })

    it("mantém o rascunho quando a equipe desiste de trocar de versão", async () => {
        const { user, callsTo } = await withVersions()
        await formReady()
        await user.clear(seatsField())
        await user.type(seatsField(), "3")

        await user.click(
            await screen.findByRole("button", { name: "Editar a mudança de 10/11/2026" })
        )
        const dialog = screen.getByRole("dialog", { name: "Descartar as alterações não salvas?" })
        await user.click(within(dialog).getByRole("button", { name: "Voltar" }))

        expect(screen.getByText("Editando a configuração que vale hoje")).toBeInTheDocument()
        expect(seatsField()).toHaveValue(3)
        expect(callsTo("GET", "/api/v1/schedule/effective")).toEqual([])
    })

    it("recusa no campo a data de hoje, sem carregar a versão nem deixar salvar", async () => {
        const { user, callsTo } = await withVersions()
        await formReady()
        await previewReady()
        await user.clear(seatsField())
        await user.type(seatsField(), "3")

        fireEvent.change(screen.getByLabelText("Valer a partir de"), {
            target: { value: "2026-10-24" }
        })

        expect(screen.getByLabelText("Valer a partir de")).toHaveAccessibleDescription(
            "Escolha uma data a partir de amanhã."
        )
        expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeDisabled()
        expect(callsTo("GET", "/api/v1/schedule/effective")).toEqual([])
    })

    it("recusa no campo a data de hoje em São Paulo enquanto a prévia não carregou", async () => {
        vi.useFakeTimers({ toFake: ["Date"] })
        vi.setSystemTime(new Date("2026-10-24T23:30:00-03:00"))
        try {
            const { callsTo } = await withVersions({
                "GET /api/v1/schedule/preview": () => ({
                    status: 500,
                    body: { error: { code: "INTERNAL_SERVER_ERROR", message: "x" } }
                })
            })
            await formReady()

            fireEvent.change(screen.getByLabelText("Valer a partir de"), {
                target: { value: "2026-10-24" }
            })

            expect(screen.getByLabelText("Valer a partir de")).toHaveAccessibleDescription(
                "Escolha uma data a partir de amanhã."
            )
            expect(callsTo("GET", "/api/v1/schedule/effective")).toEqual([])
        } finally {
            vi.useRealTimers()
        }
    })

    it("avisa quando a lista de mudanças agendadas não carrega", async () => {
        await renderSchedulePage({
            handlers: {
                "GET /api/v1/schedule/versions": () => ({
                    status: 500,
                    body: { error: { code: "INTERNAL_SERVER_ERROR", message: "x" } }
                })
            }
        })

        expect(
            await screen.findByText("Não foi possível carregar as mudanças agendadas.", {}, SLOW)
        ).toBeInTheDocument()
    })

    it("volta à configuração de hoje", async () => {
        const { user } = await withVersions()
        await formReady()
        await user.click(
            await screen.findByRole("button", { name: "Editar a mudança de 10/11/2026" })
        )
        await waitFor(() => expect(seatsField()).toHaveValue(4), SLOW)

        await user.click(screen.getByRole("button", { name: "Voltar à configuração de hoje" }))

        expect(await screen.findByText("Editando a configuração que vale hoje")).toBeInTheDocument()
        await waitFor(() => expect(seatsField()).toHaveValue(2), SLOW)
        expect(screen.getByLabelText("Valer a partir de")).toHaveValue("")
    })

    it("mostra no bloqueio o erro do servidor para a data fora da vigência da mudança", async () => {
        const blocked = {
            date: "2026-11-05",
            startTime: null,
            endTime: null,
            description: "Recesso"
        }
        const version = { ...VERSION, blockedDates: [blocked] }
        const { user } = await withVersions({
            "GET /api/v1/schedule/effective": () => ({ status: 200, body: { data: version } }),
            [`PUT /api/v1/schedule/versions/${CHANGE}`]: () => ({
                status: 400,
                body: {
                    error: {
                        code: "BAD_REQUEST",
                        message: "x",
                        details: {
                            issues: [
                                {
                                    path: "blockedDates.0.date",
                                    message:
                                        "Esta data vem antes do início desta mudança (10/11). Bloqueie na configuração que vale nessa data."
                                }
                            ]
                        }
                    }
                }
            })
        })
        await formReady()
        await user.click(
            await screen.findByRole("button", { name: "Editar a mudança de 10/11/2026" })
        )
        await waitFor(() => expect(seatsField()).toHaveValue(4), SLOW)
        await user.clear(seatsField())
        await user.type(seatsField(), "3")

        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

        expect(
            await screen.findByText(
                "Esta data vem antes do início desta mudança (10/11). Bloqueie na configuração que vale nessa data.",
                {},
                SLOW
            )
        ).toBeInTheDocument()
        expect(
            screen.queryByText(
                "Não foi possível salvar os horários. Confira os dados e tente de novo."
            )
        ).not.toBeInTheDocument()
    })
})
