import { act, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import NAV_ITEMS_ALL_READY from "@/testUtils/navItemsAllReady"
import renderScheduleHook from "@/testUtils/renderScheduleHook"
import type BookedDay from "@/types/schedule/BookedDay.types"

vi.setConfig({ testTimeout: 20000 })

const BOOKED: BookedDay[] = [
    { date: "2026-11-04", weekday: 3, total: 2, times: [{ time: "09:00", count: 2 }] },
    { date: "2026-11-11", weekday: 3, total: 1, times: [{ time: "14:00", count: 1 }] }
]

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
})

async function ready(options: Parameters<typeof renderScheduleHook>[0] = {}) {
    const rendered = await renderScheduleHook(options)
    await waitFor(() => expect(rendered.result.current.status).toBe("ready"))

    return rendered
}

describe("useSchedule: rascunho", () => {
    it("carrega a configuração e monta os 7 dias de segunda a domingo", async () => {
        const { result } = await ready()

        expect(result.current.days.map((day) => [day.weekday, day.enabled])).toEqual([
            [1, true],
            [2, true],
            [3, true],
            [4, true],
            [5, true],
            [6, false],
            [0, false]
        ])
        expect(result.current.lastChange).toEqual({
            changedBy: "Ana Paula Souza",
            changedAt: "2026-10-20T13:00:00.000Z"
        })
        expect(result.current.changes).toEqual([])
    })

    it("fica em erro quando o GET falha", async () => {
        const { result } = await renderScheduleHook({
            handlers: {
                "GET /api/v1/schedule": () => ({
                    status: 500,
                    body: { error: { code: "SCHEDULE_NOT_CONFIGURED", message: "x" } }
                })
            }
        })

        await waitFor(() => expect(result.current.status).toBe("error"))
    })

    it("conta a alteração e a tira quando o valor volta ao salvo", async () => {
        const { result } = await ready()

        act(() => result.current.actions.setText("seatsPerSlot", "3"))
        const changed = result.current.changes
        act(() => result.current.actions.setText("seatsPerSlot", "2"))

        expect(changed).toEqual(["vagas"])
        expect(result.current.changes).toEqual([])
    })

    it("descarta o rascunho sem chamar a API", async () => {
        const { result, calls } = await ready()
        act(() => result.current.actions.setSlotMinutes(60))
        act(() => result.current.actions.toggleReminder())
        const before = calls.length

        act(() => result.current.discard())

        expect(result.current.changes).toEqual([])
        expect(result.current.draft?.slotMinutes).toBe(30)
        expect(calls.length).toBe(before)
    })

    it("liga o dia sem faixas com 08:30–11:30 e adiciona 13:30–16:30 até 3 faixas", async () => {
        const { result } = await ready()

        act(() => result.current.actions.toggleDay(6))
        act(() => result.current.actions.addRange(6))
        act(() => result.current.actions.addRange(6))
        act(() => result.current.actions.addRange(6))

        const saturday = result.current.days.find((day) => day.weekday === 6)
        expect(saturday?.ranges.map((range) => [range.startTime, range.endTime])).toEqual([
            ["08:30", "11:30"],
            ["13:30", "16:30"],
            ["13:30", "16:30"]
        ])
        expect(saturday?.canAdd).toBe(false)
        expect(result.current.changes).toEqual(["grade semanal"])
    })

    it("mostra o erro da faixa e o conta na dica do salvar", async () => {
        const { result } = await ready()

        act(() => result.current.actions.changeRange(1, 0, "endTime", "08:00"))

        expect(result.current.days[0].ranges[0].error).toBe("O fim deve ser depois do início")
        expect(result.current.saveDisabled).toBe(true)
        expect(result.current.saveHint).toBe("1 campo com erro. Corrija para salvar.")
    })

    it("reavalia as faixas ao trocar a duração", async () => {
        const { result } = await ready()
        act(() => result.current.actions.changeRange(1, 0, "endTime", "09:00"))
        const before = result.current.days[0].ranges[0].error

        act(() => result.current.actions.setSlotMinutes(60))

        expect(before).toBeNull()
        expect(result.current.days[0].ranges[0].error).toBe(
            "Esta faixa não comporta nenhum atendimento de 60 minutos"
        )
    })

    it("mostra as mensagens dos campos com o texto do servidor", async () => {
        const { result } = await ready()

        act(() => result.current.actions.setText("windowDays", ""))
        act(() => result.current.actions.setText("unitAddress", " "))

        expect(result.current.windowMessages).toEqual([
            "Janela de agendamento deve estar entre 1 e 180 dias"
        ])
        expect(result.current.addressMessages).toEqual(["Endereço da unidade obrigatório"])
        expect(result.current.saveHint).toBe("2 campos com erro. Corrija para salvar.")
    })

    it("diz que as vagas precisam ser um número inteiro quando o valor é decimal", async () => {
        const { result } = await ready()

        act(() => result.current.actions.setText("seatsPerSlot", "2.5"))

        expect(result.current.seatsMessages).toEqual([
            "Vagas por horário devem ser um número inteiro"
        ])
    })

    it("adiciona o bloqueio de dia inteiro com a descrição sem espaços e limpa o formulário", async () => {
        const { result } = await ready()

        act(() => result.current.actions.setNewBlockDate("2026-11-20"))
        act(() => result.current.actions.setNewBlockDescription("  Consciência Negra  "))
        act(() => result.current.actions.addBlock())

        expect(result.current.blocks.map((block) => [block.date, block.description])).toEqual([
            ["2026-11-02", "Finados (feriado nacional)"],
            ["2026-11-20", "Consciência Negra"]
        ])
        expect(result.current.newBlock).toEqual({ date: "", description: "" })
        expect(result.current.changes).toEqual(["datas bloqueadas"])
    })

    it.each([
        ["", "Feriado", "Informe a data."],
        ["2026-11-02", "Feriado", "Esta data já tem um bloqueio"],
        ["2026-11-20", " ", "Descrição do bloqueio obrigatória"],
        ["2026-11-20", "a".repeat(151), "Descrição deve ter no máximo 150 caracteres"]
    ])("recusa o bloqueio %j com a mensagem certa", async (date, description, message) => {
        const { result } = await ready()

        act(() => result.current.actions.setNewBlockDate(date))
        act(() => result.current.actions.setNewBlockDescription(description))
        act(() => result.current.actions.addBlock())

        expect(result.current.newBlockError).toBe(message)
        expect(result.current.blocks).toHaveLength(1)
    })

    it("remove um bloqueio e marca a alteração", async () => {
        const { result } = await ready()

        act(() => result.current.actions.removeBlock(0))

        expect(result.current.blocks).toEqual([])
        expect(result.current.changes).toEqual(["datas bloqueadas"])
    })

    it("mostra o link de Conteúdo só quando a tela está pronta e a conta pode", async () => {
        const notReady = await ready({ ready: { ...NAV_ITEMS_ALL_READY, content: false } })
        const withoutPermission = await ready({
            account: {
                id: 2,
                name: "Bruno Lima",
                email: "bruno@exemplo.gov.br",
                isAdmin: false,
                permissions: ["schedule.configure"]
            }
        })
        const allowed = await ready()

        expect(notReady.result.current.showContentLink).toBe(false)
        expect(withoutPermission.result.current.showContentLink).toBe(false)
        expect(allowed.result.current.showContentLink).toBe(true)
    })
})

describe("useSchedule: dias com agendamento", () => {
    it("recusa desligar o dia da semana com agendamento e explica com as datas", async () => {
        const { result } = await ready({ bookedDays: BOOKED })
        await waitFor(() => expect(result.current.bookedDays).toHaveLength(2))

        act(() => result.current.actions.toggleDay(3))

        const wednesday = result.current.days.find((day) => day.weekday === 3)
        expect(wednesday?.enabled).toBe(true)
        expect(wednesday?.lockedReason).toBe(
            "Há agendamentos em 04/11 e 11/11. Para desligar este dia, peça a quem gerencia os agendamentos para cancelar ou remarcar antes."
        )
        expect(result.current.changes).toEqual([])
    })

    it("cita só as 3 primeiras datas quando há mais", async () => {
        const many = ["2026-11-04", "2026-11-11", "2026-11-18", "2026-11-25"].map((date) => ({
            date,
            weekday: 3,
            total: 1,
            times: [{ time: "09:00", count: 1 }]
        }))
        const { result } = await ready({ bookedDays: many })
        await waitFor(() => expect(result.current.bookedDays).toHaveLength(4))

        expect(result.current.days.find((day) => day.weekday === 3)?.lockedReason).toBe(
            "Há agendamentos em 04/11, 11/11 e 18/11 e em outras datas. Para desligar este dia, peça a quem gerencia os agendamentos para cancelar ou remarcar antes."
        )
    })

    it("mostra o ano nas datas da trava quando elas cruzam a virada do ano", async () => {
        const crossing = ["2026-12-30", "2027-01-06"].map((date) => ({
            date,
            weekday: 3,
            total: 1,
            times: [{ time: "09:00", count: 1 }]
        }))
        const { result } = await ready({ bookedDays: crossing })
        await waitFor(() => expect(result.current.bookedDays).toHaveLength(2))

        expect(result.current.days.find((day) => day.weekday === 3)?.lockedReason).toBe(
            "Há agendamentos em 30/12/2026 e 06/01/2027. Para desligar este dia, peça a quem gerencia os agendamentos para cancelar ou remarcar antes."
        )
    })

    it("recusa remover a faixa que cobre um agendamento e deixa a outra livre", async () => {
        const { result } = await ready({ bookedDays: BOOKED })
        await waitFor(() => expect(result.current.bookedDays).toHaveLength(2))
        const wednesday = () => result.current.days.find((day) => day.weekday === 3)

        act(() => result.current.actions.removeRange(3, 0))

        expect(wednesday()?.ranges.map((range) => range.removeLocked)).toEqual([true, true])
        expect(wednesday()?.ranges).toHaveLength(2)
        expect(result.current.days[0].ranges.map((range) => range.removeLocked)).toEqual([
            false,
            false
        ])
    })

    it("recusa bloquear a data com agendamento com a quantidade do dia", async () => {
        const { result } = await ready({ bookedDays: BOOKED })
        await waitFor(() => expect(result.current.bookedDays).toHaveLength(2))

        act(() => result.current.actions.setNewBlockDate("2026-11-04"))
        act(() => result.current.actions.setNewBlockDescription("Ponto facultativo"))
        act(() => result.current.actions.addBlock())

        expect(result.current.newBlockError).toBe(
            "Esta data tem 2 agendamentos. Para bloqueá-la, peça a quem gerencia os agendamentos para cancelar ou remarcar antes."
        )
        expect(result.current.blocks).toHaveLength(1)
    })

    it("não trava nada sem agendamento", async () => {
        const { result } = await ready()

        act(() => result.current.actions.toggleDay(3))
        act(() => result.current.actions.removeRange(1, 0))

        expect(result.current.days.every((day) => day.lockedReason === null)).toBe(true)
        expect(result.current.days.find((day) => day.weekday === 3)?.enabled).toBe(false)
        expect(result.current.days[0].ranges).toHaveLength(1)
    })

    it("avisa quando não consegue ler os dias com agendamento", async () => {
        const { result } = await ready({
            handlers: {
                "GET /api/v1/schedule/booked-days": () => ({
                    status: 500,
                    body: { error: { code: "INTERNAL_ERROR", message: "x" } }
                })
            }
        })

        await waitFor(() => expect(result.current.bookedDaysFailed).toBe(true))
    })
})
