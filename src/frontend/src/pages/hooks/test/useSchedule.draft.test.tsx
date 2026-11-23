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

type Draft = Awaited<ReturnType<typeof ready>>["result"]

function addPeriodBlock(result: Draft, date: string, startTime: string, endTime: string) {
    act(() => result.current.actions.setNewBlockDate(date))
    act(() => result.current.actions.setNewBlockDescription("Reunião"))
    act(() => result.current.actions.setNewBlockFullDay(false))
    act(() => result.current.actions.setNewBlockStartTime(startTime))
    act(() => result.current.actions.setNewBlockEndTime(endTime))
    act(() => result.current.actions.addBlock())
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
        expect(result.current.newBlock).toEqual({
            date: "",
            description: "",
            fullDay: true,
            startTime: "",
            endTime: ""
        })
        expect(result.current.changes).toEqual(["datas bloqueadas"])
    })

    it("adiciona o bloqueio de período com início e fim", async () => {
        const { result } = await ready()

        addPeriodBlock(result, "2026-11-20", "08:30", "10:00")

        expect(result.current.newBlockError).toBeNull()
        expect(result.current.blocks.find((block) => block.date === "2026-11-20")).toMatchObject({
            startTime: "08:30",
            endTime: "10:00",
            description: "Reunião"
        })
        expect(result.current.newBlock.fullDay).toBe(true)
    })

    it("guarda bloqueio de dia inteiro sem horário quando o dia inteiro está marcado", async () => {
        const { result } = await ready()

        act(() => result.current.actions.setNewBlockDate("2026-11-20"))
        act(() => result.current.actions.setNewBlockDescription("Feriado"))
        act(() => result.current.actions.setNewBlockStartTime("16:00"))
        act(() => result.current.actions.setNewBlockEndTime("13:00"))
        act(() => result.current.actions.addBlock())

        expect(result.current.newBlockError).toBeNull()
        expect(result.current.blocks.find((block) => block.date === "2026-11-20")).toMatchObject({
            startTime: null,
            endTime: null
        })
    })

    it("aceita dois períodos da mesma data sem sobreposição", async () => {
        const { result } = await ready()

        addPeriodBlock(result, "2026-11-20", "08:00", "12:00")
        addPeriodBlock(result, "2026-11-20", "13:00", "17:00")

        expect(result.current.newBlockError).toBeNull()
        expect(result.current.blocks.filter((block) => block.date === "2026-11-20")).toHaveLength(2)
    })

    it("recusa período que se sobrepõe a outro da mesma data", async () => {
        const { result } = await ready()

        addPeriodBlock(result, "2026-11-20", "08:00", "12:00")
        addPeriodBlock(result, "2026-11-20", "11:00", "14:00")

        expect(result.current.newBlockError).toBe(
            "Este período se sobrepõe a outro bloqueio desta data"
        )
        expect(result.current.blocks.filter((block) => block.date === "2026-11-20")).toHaveLength(1)
    })

    it("recusa período com o fim antes do início e marca o erro no período", async () => {
        const { result } = await ready()

        addPeriodBlock(result, "2026-11-20", "10:00", "09:00")

        expect(result.current.newBlockError).toBe("O fim deve ser depois do início.")
        expect(result.current.newBlockPeriodInvalid).toBe(true)
        expect(result.current.blocks).toHaveLength(1)
    })

    it("recusa período com só o início preenchido", async () => {
        const { result } = await ready()

        addPeriodBlock(result, "2026-11-20", "10:00", "")

        expect(result.current.newBlockError).toBe("Informe o início e o fim do período.")
        expect(result.current.newBlockPeriodInvalid).toBe(true)
    })

    it("não marca o período quando o erro é da data", async () => {
        const { result } = await ready()

        act(() => result.current.actions.addBlock())

        expect(result.current.newBlockError).toBe("Informe a data.")
        expect(result.current.newBlockPeriodInvalid).toBe(false)
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
    it("permite desligar o dia da semana, remover faixa e bloquear data mesmo com agendamento", async () => {
        const { result } = await ready({ bookedDays: BOOKED })
        await waitFor(() => expect(result.current.bookedDays).toHaveLength(2))

        act(() => result.current.actions.removeRange(3, 0))
        expect(result.current.days.find((day) => day.weekday === 3)?.ranges).toHaveLength(1)

        act(() => result.current.actions.toggleDay(3))
        expect(result.current.days.find((day) => day.weekday === 3)?.enabled).toBe(false)

        act(() => result.current.actions.setNewBlockDate("2026-11-04"))
        act(() => result.current.actions.setNewBlockDescription("Ponto facultativo"))
        act(() => result.current.actions.addBlock())

        expect(result.current.newBlockError).toBeNull()
        expect(result.current.blocks).toHaveLength(2)
    })

    it("adiciona bloqueio de período que sobrepõe um agendamento sem recusar", async () => {
        const { result } = await ready({ bookedDays: BOOKED })
        await waitFor(() => expect(result.current.bookedDays).toHaveLength(2))

        addPeriodBlock(result, "2026-11-04", "08:30", "09:30")

        expect(result.current.newBlockError).toBeNull()
        expect(result.current.blocks.find((block) => block.date === "2026-11-04")).toMatchObject({
            startTime: "08:30",
            endTime: "09:30"
        })
    })

    it("não trava nada sem agendamento", async () => {
        const { result } = await ready()

        act(() => result.current.actions.toggleDay(3))
        act(() => result.current.actions.removeRange(1, 0))

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
