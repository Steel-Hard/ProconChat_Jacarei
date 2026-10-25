import { act, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import buildMonthlyPreview from "@/testUtils/buildMonthlyPreview"
import renderScheduleHook from "@/testUtils/renderScheduleHook"
import type SchedulePreviewConflict from "@/types/schedule/SchedulePreviewConflict.types"

vi.setConfig({ testTimeout: 20000 })

const CONFLICT: SchedulePreviewConflict = {
    protocol: "A1B2C3D4",
    date: "2026-11-04",
    time: "14:00",
    status: "CONFIRMED",
    code: "RANGE_CHANGED",
    reason: "Faixa de horário removida ou alterada"
}

type Reply = { status: number; body?: unknown }

function noRelease() {}

function deferred() {
    let release: (reply: Reply) => void = noRelease
    const promise = new Promise<Reply>((resolve) => {
        release = resolve
    })

    return { promise, release }
}

afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
})

async function ready(options: Parameters<typeof renderScheduleHook>[0] = {}) {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const rendered = await renderScheduleHook(options)
    await waitFor(() => expect(rendered.result.current.preview.preview).not.toBeNull())

    return rendered
}

async function settle(ms = 400) {
    await act(async () => {
        await vi.advanceTimersByTimeAsync(ms)
    })
}

describe("useSchedule: prévia", () => {
    it("pede a prévia salva sem mês e depois o mês escolhido", async () => {
        const { result, callsTo } = await ready()

        act(() => result.current.preview.shiftMonth(1))
        await waitFor(() => expect(result.current.preview.preview?.month).toBe("2026-12"))

        const urls = callsTo("GET", "/api/v1/schedule/preview").map((call) => call.url.search)
        expect(urls).toEqual(["", "?month=2026-12"])
        expect(callsTo("POST", "/api/v1/schedule/preview")).toEqual([])
    })

    it("manda o rascunho 400 ms depois da última edição, igual ao corpo do PUT", async () => {
        const { result, callsTo } = await ready({
            handlers: {
                "PUT /api/v1/schedule": () => ({
                    status: 500,
                    body: { error: { code: "INTERNAL_ERROR", message: "x" } }
                })
            }
        })

        act(() => result.current.actions.setText("seatsPerSlot", "3"))
        await settle(300)
        const early = callsTo("POST", "/api/v1/schedule/preview").length
        await settle(100)
        await waitFor(() => expect(callsTo("POST", "/api/v1/schedule/preview")).toHaveLength(1))
        act(() => result.current.save())
        await waitFor(() => expect(callsTo("PUT", "/api/v1/schedule")).toHaveLength(1))

        const [post] = callsTo("POST", "/api/v1/schedule/preview")
        const [put] = callsTo("PUT", "/api/v1/schedule")
        expect(early).toBe(0)
        expect(post.body).toEqual({ config: put.body })
        expect((put.body as { seatsPerSlot: number }).seatsPerSlot).toBe(3)
    })

    it("não manda o rascunho aos 399 ms e manda aos 400 ms com o relógio parado", async () => {
        vi.useRealTimers()
        const { result, callsTo } = await renderScheduleHook()
        await waitFor(() => expect(result.current.preview.preview).not.toBeNull())
        vi.useFakeTimers()

        act(() => result.current.actions.setText("seatsPerSlot", "3"))
        await act(async () => {
            await vi.advanceTimersByTimeAsync(399)
        })
        const at399 = callsTo("POST", "/api/v1/schedule/preview").length
        await act(async () => {
            await vi.advanceTimersByTimeAsync(1)
        })
        for (
            let tick = 0;
            tick < 50 && callsTo("POST", "/api/v1/schedule/preview").length === 0;
            tick += 1
        ) {
            await act(async () => {
                await Promise.resolve()
            })
        }

        expect(at399).toBe(0)
        expect(callsTo("POST", "/api/v1/schedule/preview")).toHaveLength(1)
    })

    it("junta duas edições seguidas em um só POST", async () => {
        const { result, callsTo } = await ready()

        act(() => result.current.actions.setText("seatsPerSlot", "3"))
        await settle(200)
        act(() => result.current.actions.setText("seatsPerSlot", "4"))
        await settle(400)
        await settle(400)

        const posts = callsTo("POST", "/api/v1/schedule/preview")
        expect(posts).toHaveLength(1)
        expect((posts[0].body as { config: { seatsPerSlot: number } }).config.seatsPerSlot).toBe(4)
    })

    it("não troca a prévia pela resposta de um rascunho antigo", async () => {
        const first = deferred()
        const second = deferred()
        const pending = [first, second]
        const { result } = await ready({
            handlers: { "POST /api/v1/schedule/preview": () => pending.shift()!.promise }
        })

        act(() => result.current.actions.setText("seatsPerSlot", "3"))
        await settle()
        act(() => result.current.actions.setText("seatsPerSlot", "4"))
        await settle()
        await act(async () => {
            second.release({
                status: 200,
                body: { data: buildMonthlyPreview("2026-11", [], { freeWindowSeats: 44 }) }
            })
            await vi.advanceTimersByTimeAsync(0)
        })
        await waitFor(() => expect(result.current.preview.preview?.freeWindowSeats).toBe(44))
        await act(async () => {
            first.release({
                status: 200,
                body: { data: buildMonthlyPreview("2026-11", [], { freeWindowSeats: 33 }) }
            })
            await vi.advanceTimersByTimeAsync(10)
        })

        expect(result.current.preview.preview?.freeWindowSeats).toBe(44)
    })

    it("com erro local não pede a prévia e mantém a última válida com o aviso", async () => {
        const { result, callsTo } = await ready()
        const shown = result.current.preview.preview

        act(() => result.current.actions.setText("seatsPerSlot", "0"))
        await settle()
        await settle()

        expect(callsTo("POST", "/api/v1/schedule/preview")).toEqual([])
        expect(result.current.preview.preview).toBe(shown)
        expect(result.current.preview.stale).toBe(true)
    })

    it("trava o salvar com os conflitos da prévia atual e libera quando somem", async () => {
        const { result } = await ready({
            handlers: {
                "POST /api/v1/schedule/preview": ({ body }) => ({
                    status: 200,
                    body: {
                        data: buildMonthlyPreview("2026-11", [], {
                            conflicts:
                                (body as { config: { seatsPerSlot: number } }).config
                                    .seatsPerSlot === 1
                                    ? [CONFLICT]
                                    : []
                        })
                    }
                })
            }
        })

        act(() => result.current.actions.setText("seatsPerSlot", "1"))
        await settle()
        await waitFor(() => expect(result.current.conflictRows).toEqual([CONFLICT]))
        const blocked = [result.current.saveDisabled, result.current.saveHint]
        act(() => result.current.actions.setText("seatsPerSlot", "3"))
        await settle()
        await waitFor(() => expect(result.current.conflictRows).toBeNull())

        expect(blocked).toEqual([true, "A alteração afeta agendamentos. Veja a lista abaixo."])
        expect(result.current.saveDisabled).toBe(false)
        expect(result.current.days.find((day) => day.weekday === 3)?.messages).toEqual([])
    })

    it("liga o conflito da prévia ao campo certo", async () => {
        const { result } = await ready({
            handlers: {
                "POST /api/v1/schedule/preview": () => ({
                    status: 200,
                    body: {
                        data: buildMonthlyPreview("2026-11", [], {
                            conflicts: [
                                CONFLICT,
                                {
                                    ...CONFLICT,
                                    protocol: "SEAT0001",
                                    code: "SEATS_REDUCED",
                                    reason: "Vagas"
                                },
                                {
                                    ...CONFLICT,
                                    protocol: "DURA0001",
                                    code: "DURATION_CHANGED",
                                    reason: "Duração"
                                },
                                {
                                    ...CONFLICT,
                                    protocol: "BLOQ0001",
                                    code: "DATE_BLOCKED",
                                    date: "2026-11-02",
                                    reason: "Bloqueio"
                                }
                            ]
                        })
                    }
                })
            }
        })

        act(() => result.current.actions.setText("seatsPerSlot", "1"))
        await settle()
        await waitFor(() => expect(result.current.conflictRows).toHaveLength(4))

        expect(result.current.days.find((day) => day.weekday === 3)?.messages).toEqual([
            "Afeta o agendamento A1B2C3D4 (04/11/2026 às 14:00): Faixa de horário removida ou alterada"
        ])
        expect(result.current.seatsMessages).toEqual([
            "Afeta o agendamento SEAT0001 (04/11/2026 às 14:00): Vagas"
        ])
        expect(result.current.durationMessages).toEqual([
            "Afeta o agendamento DURA0001 (04/11/2026 às 14:00): Duração"
        ])
        expect(result.current.blocks[0].messages).toEqual([
            "Afeta o agendamento BLOQ0001 (02/11/2026 às 14:00): Bloqueio"
        ])
    })

    it("não trava o salvar enquanto a prévia do rascunho não voltou", async () => {
        const never = deferred()
        const { result, callsTo } = await ready({
            handlers: { "POST /api/v1/schedule/preview": () => never.promise }
        })

        act(() => result.current.actions.setText("seatsPerSlot", "3"))
        await settle()
        await waitFor(() => expect(callsTo("POST", "/api/v1/schedule/preview")).toHaveLength(1))

        expect(result.current.saveDisabled).toBe(false)
        expect(result.current.conflictRows).toBeNull()
        never.release({ status: 200, body: { data: buildMonthlyPreview() } })
    })

    it("não usa os conflitos da prévia de um rascunho anterior enquanto a nova não volta", async () => {
        const pending = deferred()
        let calls = 0
        const { result } = await ready({
            handlers: {
                "POST /api/v1/schedule/preview": () => {
                    calls += 1

                    return calls === 1
                        ? {
                              status: 200,
                              body: {
                                  data: buildMonthlyPreview("2026-11", [], {
                                      conflicts: [CONFLICT]
                                  })
                              }
                          }
                        : pending.promise
                }
            }
        })

        act(() => result.current.actions.setText("seatsPerSlot", "1"))
        await settle()
        await waitFor(() => expect(result.current.conflictRows).toEqual([CONFLICT]))
        act(() => result.current.actions.setText("seatsPerSlot", "3"))
        await settle()
        await waitFor(() => expect(calls).toBe(2))

        expect(result.current.conflictRows).toBeNull()
        expect(result.current.saveDisabled).toBe(false)
        pending.release({ status: 200, body: { data: buildMonthlyPreview() } })
    })

    it("mostra a falha da prévia sem afetar o formulário", async () => {
        const { result } = await ready({
            handlers: {
                "POST /api/v1/schedule/preview": () => ({
                    status: 400,
                    body: { error: { code: "BAD_REQUEST", message: "x", details: { issues: [] } } }
                })
            }
        })

        act(() => result.current.actions.setText("seatsPerSlot", "3"))
        await settle()
        await waitFor(() => expect(result.current.preview.failed).toBe(true))

        expect(result.current.saveDisabled).toBe(false)
        expect(result.current.actionError).toBeNull()
    })
})
