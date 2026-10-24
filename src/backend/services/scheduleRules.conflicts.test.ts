import { describe, expect, it } from "vitest"
import { FutureActiveAppointment, NormalizedScheduleConfig } from "../types/schedule.types"
import { buildScheduleConfigInput as baseInput } from "./mock/scheduleConfig.builders"
import { detectScheduleConflicts, normalizeAndValidateScheduleConfig } from "./scheduleRules"

function makeAppt(
    id: string,
    isoLocal: string,
    requestOrder = Number(id),
): FutureActiveAppointment {
    return {
        id,
        protocol: `PROT000${id}`,
        name: `Cidadão ${id}`,
        cpfMasked: `***.000.00${id}-**`,
        appointmentDatetime: new Date(isoLocal),
        requestDatetime: new Date(2026, 9, 1, 10, requestOrder, 0),
        status: "CONFIRMED",
    }
}

function scenarioConfig(): NormalizedScheduleConfig {
    return normalizeAndValidateScheduleConfig(
        baseInput({
            slotMinutes: 60,
            seatsPerSlot: 1,
            ranges: [
                { weekday: 2, startTime: "08:00", endTime: "12:00" },
                { weekday: 3, startTime: "09:00", endTime: "12:00" },
                { weekday: 4, startTime: "08:00", endTime: "12:00" },
            ],
            blockedDates: [
                {
                    date: "2026-10-06",
                    startTime: null,
                    endTime: null,
                    description: "Feriado Municipal",
                },
                {
                    date: "2026-10-08",
                    startTime: "10:00",
                    endTime: "12:00",
                    description: "Reunião interna",
                },
            ],
        }),
    )
}

function codesAndReasons(appointments: FutureActiveAppointment[]) {
    return detectScheduleConflicts(scenarioConfig(), appointments).map((c) => ({
        id: c.id,
        code: c.code,
        reason: c.reason,
    }))
}

describe("detectScheduleConflicts", () => {
    it("aponta DATE_BLOCKED para o agendamento numa data bloqueada inteira", () => {
        const conflicts = codesAndReasons([makeAppt("1", "2026-10-06T08:00:00-03:00")])

        expect(conflicts).toEqual([
            { id: "1", code: "DATE_BLOCKED", reason: "Data bloqueada: Feriado Municipal" },
        ])
    })

    it("aponta PERIOD_BLOCKED para o agendamento num período bloqueado", () => {
        const conflicts = codesAndReasons([makeAppt("2", "2026-10-08T10:00:00-03:00")])

        expect(conflicts).toEqual([
            { id: "2", code: "PERIOD_BLOCKED", reason: "Período bloqueado (10:00–12:00)" },
        ])
    })

    it("aponta DAY_WITHOUT_SERVICE para o agendamento num dia sem faixas na nova grade", () => {
        const conflicts = codesAndReasons([makeAppt("3", "2026-10-09T08:00:00-03:00")])

        expect(conflicts).toEqual([
            { id: "3", code: "DAY_WITHOUT_SERVICE", reason: "Dia sem atendimento na nova grade" },
        ])
    })

    it("aponta DURATION_CHANGED para o horário dentro da faixa que deixou de existir com a nova duração", () => {
        const conflicts = codesAndReasons([makeAppt("4", "2026-10-07T09:30:00-03:00")])

        expect(conflicts).toEqual([
            {
                id: "4",
                code: "DURATION_CHANGED",
                reason: "Horário deixou de existir com atendimentos de 60 minutos",
            },
        ])
    })

    it("aponta RANGE_CHANGED para o horário fora das faixas do dia", () => {
        const conflicts = codesAndReasons([makeAppt("5", "2026-10-07T08:00:00-03:00")])

        expect(conflicts).toEqual([
            { id: "5", code: "RANGE_CHANGED", reason: "Faixa de horário removida ou alterada" },
        ])
    })

    it("aponta SEATS_REDUCED só para quem passa das vagas e mantém o primeiro agendado", () => {
        const conflicts = codesAndReasons([
            makeAppt("6", "2026-10-08T08:00:00-03:00", 10),
            makeAppt("7", "2026-10-08T08:00:00-03:00", 20),
        ])

        expect(conflicts).toEqual([
            {
                id: "7",
                code: "SEATS_REDUCED",
                reason: "Vagas reduzidas para 1; este horário tem 2 agendamentos",
            },
        ])
        expect(conflicts.some((c) => c.id === "6")).toBe(false)
    })

    it("tira a vaga de quem pediu por último no SEATS_REDUCED, mesmo com id menor", () => {
        const conflicts = codesAndReasons([
            makeAppt("8", "2026-10-08T09:00:00-03:00", 40),
            makeAppt("9", "2026-10-08T09:00:00-03:00", 5),
        ])

        expect(conflicts.map((c) => [c.id, c.code])).toEqual([["8", "SEATS_REDUCED"]])
    })

    it("desempata pelo id maior no SEATS_REDUCED quando os pedidos foram no mesmo instante", () => {
        const conflicts = codesAndReasons([
            makeAppt("11", "2026-10-08T09:00:00-03:00", 15),
            makeAppt("10", "2026-10-08T09:00:00-03:00", 15),
        ])

        expect(conflicts.map((c) => [c.id, c.code])).toEqual([["11", "SEATS_REDUCED"]])
    })

    it("aponta DAY_WITHOUT_SERVICE para cada agendamento futuro quando a nova grade não tem faixas", () => {
        const config = normalizeAndValidateScheduleConfig(baseInput({ ranges: [] }))

        const conflicts = detectScheduleConflicts(config, [
            makeAppt("1", "2026-10-06T08:00:00-03:00"),
            makeAppt("2", "2026-10-07T13:00:00-03:00"),
        ])

        expect(conflicts.map((c) => [c.id, c.code, c.reason])).toEqual([
            ["1", "DAY_WITHOUT_SERVICE", "Dia sem atendimento na nova grade"],
            ["2", "DAY_WITHOUT_SERVICE", "Dia sem atendimento na nova grade"],
        ])
    })
})
