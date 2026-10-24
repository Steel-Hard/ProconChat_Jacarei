import { act, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import buildScheduleConfig from "@/testUtils/buildScheduleConfig"
import renderScheduleHook from "@/testUtils/renderScheduleHook"

vi.setConfig({ testTimeout: 20000 })

type Reply = { status: number; body?: unknown }

function noRelease() {}

const SAVED = buildScheduleConfig({
    seatsPerSlot: 3,
    updatedBy: { id: 2, name: "Bruno Lima" },
    updatedAt: "2026-10-24T15:00:00.000Z"
})

const CONFLICT = {
    id: "41",
    protocol: "A1B2C3D4",
    name: "Maria Souza",
    cpfMasked: "***.982.247-**",
    appointmentDatetime: "2026-11-04T12:00:00.000Z",
    date: "2026-11-04",
    time: "09:00",
    status: "CONFIRMED",
    code: "DATE_BLOCKED",
    reason: "Data bloqueada: Feriado"
}

function failure(status: number, code: string, details?: unknown): Reply {
    return { status, body: { error: { code, message: "x", details } } }
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
})

async function ready(putReply: () => Reply | Promise<Reply>) {
    const rendered = await renderScheduleHook({
        handlers: { "PUT /api/v1/schedule": putReply }
    })
    await waitFor(() => expect(rendered.result.current.status).toBe("ready"))

    return rendered
}

describe("useSchedule: salvar", () => {
    it("envia a configuração completa, zera as alterações e atualiza a última alteração", async () => {
        const { result, callsTo } = await ready(() => ({ status: 200, body: { data: SAVED } }))
        act(() => result.current.actions.setText("seatsPerSlot", "3"))

        act(() => result.current.save())
        await waitFor(() => expect(result.current.changes).toEqual([]))

        const [put] = callsTo("PUT", "/api/v1/schedule")
        expect(put.body).toEqual({
            slotMinutes: 30,
            seatsPerSlot: 3,
            windowDays: 30,
            minNoticeDays: 1,
            waitAlertDays: 7,
            unitAddress: "Av. Nove de Julho, 215 - Centro, Jacareí - SP",
            unitAddressComplement: "Sala 2",
            reminderEnabled: true,
            reminderHours: 24,
            ranges: [1, 2, 3, 4, 5].flatMap((weekday) => [
                { weekday, startTime: "08:30", endTime: "11:30" },
                { weekday, startTime: "13:30", endTime: "16:30" }
            ]),
            blockedDates: [
                {
                    date: "2026-11-02",
                    startTime: null,
                    endTime: null,
                    description: "Finados (feriado nacional)"
                }
            ]
        })
        await waitFor(() =>
            expect(result.current.lastChange).toEqual({
                changedBy: "Bruno Lima",
                changedAt: "2026-10-24T15:00:00.000Z"
            })
        )
        expect(result.current.draft?.seatsPerSlot).toBe("3")
    })

    it("manda um só PUT com dois cliques seguidos", async () => {
        let release: (reply: Reply) => void = noRelease
        const { result, callsTo } = await ready(
            () =>
                new Promise<Reply>((resolve) => {
                    release = resolve
                })
        )
        act(() => result.current.actions.setText("seatsPerSlot", "3"))

        act(() => {
            result.current.save()
            result.current.save()
        })
        await waitFor(() => expect(result.current.saving).toBe(true))
        act(() => result.current.save())
        await waitFor(() => expect(callsTo("PUT", "/api/v1/schedule")).toHaveLength(1))
        await act(async () => release({ status: 200, body: { data: SAVED } }))

        await waitFor(() => expect(result.current.saving).toBe(false))
        expect(callsTo("PUT", "/api/v1/schedule")).toHaveLength(1)
    })

    it("não salva com erro local nem sem alteração", async () => {
        const { result, callsTo } = await ready(() => ({ status: 200, body: { data: SAVED } }))

        act(() => result.current.save())
        act(() => result.current.actions.setText("seatsPerSlot", "0"))
        act(() => result.current.save())

        expect(callsTo("PUT", "/api/v1/schedule")).toEqual([])
    })

    it("mostra os afetados do 409, trava o salvar, relê os dias com agendamento e libera ao editar", async () => {
        const { result, callsTo } = await ready(() =>
            failure(409, "SCHEDULE_CONFLICTS", { conflicts: [CONFLICT] })
        )
        act(() => result.current.actions.setText("seatsPerSlot", "3"))

        act(() => result.current.save())
        await waitFor(() => expect(result.current.conflictRows).toHaveLength(1))
        const blocked = result.current.saveDisabled
        await waitFor(() => expect(callsTo("GET", "/api/v1/schedule/booked-days")).toHaveLength(2))
        act(() => result.current.actions.setText("seatsPerSlot", "4"))

        expect(blocked).toBe(true)
        expect(result.current.conflictRows).toBeNull()
        expect(result.current.saveDisabled).toBe(false)
    })

    it("traz nome e CPF mascarado nos afetados do 409 e some ao descartar", async () => {
        const { result } = await ready(() =>
            failure(409, "SCHEDULE_CONFLICTS", { conflicts: [CONFLICT] })
        )
        act(() => result.current.actions.setText("seatsPerSlot", "3"))

        act(() => result.current.save())
        await waitFor(() => expect(result.current.conflictRows).toHaveLength(1))
        const rows = result.current.conflictRows
        act(() => result.current.discard())

        expect(rows?.[0]).toMatchObject({ name: "Maria Souza", cpfMasked: "***.982.247-**" })
        expect(result.current.conflictRows).toBeNull()
    })

    it("não mostra o 409 que chega depois de o rascunho mudar", async () => {
        let release: (reply: Reply) => void = noRelease
        const { result } = await ready(
            () =>
                new Promise<Reply>((resolve) => {
                    release = resolve
                })
        )
        act(() => result.current.actions.setText("seatsPerSlot", "3"))
        act(() => result.current.save())
        await waitFor(() => expect(result.current.saving).toBe(true))

        act(() => result.current.actions.setText("seatsPerSlot", "4"))
        await act(async () =>
            release(failure(409, "SCHEDULE_CONFLICTS", { conflicts: [CONFLICT] }))
        )
        await waitFor(() => expect(result.current.saving).toBe(false))

        expect(result.current.conflictRows).toBeNull()
    })

    it("liga o ranges.N do 400 à faixa certa pelas origens do corpo enviado", async () => {
        const { result } = await ready(() =>
            failure(400, "BAD_REQUEST", {
                issues: [
                    { path: "ranges.0.endTime", message: "Mensagem do servidor na faixa" },
                    { path: "unitAddress", message: "Mensagem do servidor no endereço" }
                ]
            })
        )
        act(() => result.current.actions.toggleDay(1))
        act(() => result.current.actions.changeRange(2, 0, "startTime", "17:00"))
        act(() => result.current.actions.changeRange(2, 0, "endTime", "18:00"))

        act(() => result.current.save())
        await waitFor(() => expect(result.current.saving).toBe(false))

        const tuesday = result.current.days.find((day) => day.weekday === 2)
        expect(tuesday?.ranges.map((range) => range.error)).toEqual([
            null,
            "Mensagem do servidor na faixa"
        ])
        expect(result.current.addressMessages).toEqual(["Mensagem do servidor no endereço"])
        expect(result.current.actionError).toBeNull()
    })

    it("mostra a falha geral para caminho desconhecido do 400", async () => {
        const { result } = await ready(() =>
            failure(400, "BAD_REQUEST", { issues: [{ path: "outro", message: "x" }] })
        )
        act(() => result.current.actions.setText("seatsPerSlot", "3"))

        act(() => result.current.save())

        await waitFor(() =>
            expect(result.current.actionError).toBe(
                "Não foi possível salvar os horários. Confira os dados e tente de novo."
            )
        )
    })

    it("mostra a mensagem comum no 403 INVALID_ORIGIN", async () => {
        const { result } = await ready(() => failure(403, "INVALID_ORIGIN"))
        act(() => result.current.actions.setText("seatsPerSlot", "3"))

        act(() => result.current.save())

        await waitFor(() =>
            expect(result.current.actionError).toBe(
                "O painel foi aberto por um endereço não autorizado. Acesse pelo endereço oficial do painel."
            )
        )
    })

    it("mostra a falha geral e mantém o rascunho em outro erro", async () => {
        const { result } = await ready(() => failure(500, "INTERNAL_ERROR"))
        act(() => result.current.actions.setText("seatsPerSlot", "3"))

        act(() => result.current.save())
        await waitFor(() => expect(result.current.actionError).not.toBeNull())

        expect(result.current.changes).toEqual(["vagas"])
    })

    it("não mostra erro próprio no 401", async () => {
        const { result, callsTo } = await ready(() => failure(401, "UNAUTHORIZED"))
        act(() => result.current.actions.setText("seatsPerSlot", "3"))

        act(() => result.current.save())
        await waitFor(() => expect(callsTo("POST", "/api/v1/auth/refresh")).toHaveLength(1))
        await waitFor(() => expect(result.current.saving).toBe(false))

        expect(result.current.actionError).toBeNull()
        expect(result.current.conflictRows).toBeNull()
    })
})
