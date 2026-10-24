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
        assignedUserId: 7,
        offGrid: false,
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
    const config = scenarioConfig()
    return detectScheduleConflicts(config, appointments, config.slotMinutes).map((c) => ({
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

        const conflicts = detectScheduleConflicts(
            config,
            [makeAppt("1", "2026-10-06T08:00:00-03:00"), makeAppt("2", "2026-10-07T13:00:00-03:00")],
            config.slotMinutes,
        )

        expect(conflicts.map((c) => [c.id, c.code, c.reason])).toEqual([
            ["1", "DAY_WITHOUT_SERVICE", "Dia sem atendimento na nova grade"],
            ["2", "DAY_WITHOUT_SERVICE", "Dia sem atendimento na nova grade"],
        ])
    })

    describe("RESPONSIBLE_OVERLAP", () => {
        function wednesdayConfig(slotMinutes: 20 | 30 | 60): NormalizedScheduleConfig {
            return normalizeAndValidateScheduleConfig(
                baseInput({
                    slotMinutes,
                    seatsPerSlot: 2,
                    ranges: [{ weekday: 3, startTime: "08:00", endTime: "12:00" }],
                    blockedDates: [],
                }),
            )
        }

        function onWednesday(
            id: string,
            time: string,
            overrides: Partial<FutureActiveAppointment> = {},
        ): FutureActiveAppointment {
            return { ...makeAppt(id, `2026-10-07T${time}:00-03:00`), ...overrides }
        }

        function detect(
            appointments: FutureActiveAppointment[],
            currentSlotMinutes: number | null,
            newSlotMinutes: 20 | 30 | 60,
        ) {
            return detectScheduleConflicts(wednesdayConfig(newSlotMinutes), appointments, currentSlotMinutes)
        }

        it("aponta o agendamento da grade quando o parceiro do mesmo responsável fora da grade passa a se sobrepor", () => {
            const conflicts = detect(
                [onWednesday("1", "09:00"), onWednesday("2", "09:30", { offGrid: true })],
                30,
                60,
            )

            expect(conflicts).toEqual([
                expect.objectContaining({
                    id: "1",
                    code: "RESPONSIBLE_OVERLAP",
                    reason: "Responsável com outro agendamento sobreposto com atendimentos de 60 minutos (protocolo PROT0002)",
                    conflictingAppointmentId: "2",
                    conflictingProtocol: "PROT0002",
                }),
            ])
        })

        it("nunca aponta o agendamento fora da grade, mesmo quando ele foi o agendado por último", () => {
            const conflicts = detect(
                [
                    onWednesday("5", "09:00", { requestDatetime: new Date(2026, 9, 1, 8, 0, 0) }),
                    onWednesday("9", "09:30", { offGrid: true, requestDatetime: new Date(2026, 9, 2, 8, 0, 0) }),
                ],
                30,
                60,
            )

            expect(conflicts.map((c) => [c.id, c.code])).toEqual([["5", "RESPONSIBLE_OVERLAP"]])
        })

        it("aponta o agendamento uma única vez com o parceiro de horário mais cedo quando há dois parceiros", () => {
            const conflicts = detect(
                [
                    onWednesday("1", "10:30", { offGrid: true }),
                    onWednesday("3", "10:00"),
                    onWednesday("2", "09:30", { offGrid: true }),
                ],
                30,
                60,
            )

            expect(conflicts).toEqual([
                expect.objectContaining({
                    id: "3",
                    code: "RESPONSIBLE_OVERLAP",
                    conflictingAppointmentId: "2",
                    conflictingProtocol: "PROT0002",
                }),
            ])
        })

        it("não acrescenta item quando o outro agendamento do par já está na lista por outro motivo", () => {
            const conflicts = detect([onWednesday("1", "09:00"), onWednesday("2", "09:30")], 30, 60)

            expect(conflicts.map((c) => [c.id, c.code])).toEqual([["2", "DURATION_CHANGED"]])
        })

        it("não aponta quando os responsáveis são diferentes", () => {
            const conflicts = detect(
                [onWednesday("1", "09:00"), onWednesday("2", "09:30", { offGrid: true, assignedUserId: 8 })],
                30,
                60,
            )

            expect(conflicts).toEqual([])
        })

        it("não aponta quando um dos dois está pendente", () => {
            const conflicts = detect(
                [onWednesday("1", "09:00", { status: "PENDING" }), onWednesday("2", "09:30", { offGrid: true })],
                30,
                60,
            )

            expect(conflicts).toEqual([])
        })

        it("não aponta quando a duração não aumenta, mesmo com o par já sobreposto", () => {
            const pair = [onWednesday("1", "09:00"), onWednesday("2", "09:15", { offGrid: true })]

            expect(detect(pair, 30, 30)).toEqual([])
            expect(detect(pair, 30, 20)).toEqual([])
        })

        it("não expõe o hash do CPF nem o responsável no item serializado", () => {
            const conflicts = detect(
                [onWednesday("1", "09:00"), onWednesday("2", "09:30", { offGrid: true })],
                30,
                60,
            )

            const serialized = JSON.parse(JSON.stringify(conflicts[0])) as Record<string, unknown>
            expect(serialized.code).toBe("RESPONSIBLE_OVERLAP")
            for (const key of ["cpfHash", "cpf_hash", "assignedUserId", "assigned_user_id"]) {
                expect(serialized).not.toHaveProperty(key)
            }
        })

        it("deixa os agendamentos fora da grade de fora dos outros seis tipos de conflito", () => {
            const offGrid = { offGrid: true }

            const conflicts = codesAndReasons([
                { ...makeAppt("1", "2026-10-06T08:00:00-03:00"), ...offGrid },
                { ...makeAppt("2", "2026-10-08T10:00:00-03:00"), ...offGrid },
                { ...makeAppt("3", "2026-10-09T08:00:00-03:00"), ...offGrid },
                { ...makeAppt("4", "2026-10-07T09:30:00-03:00"), ...offGrid },
                { ...makeAppt("5", "2026-10-07T08:00:00-03:00"), ...offGrid },
                { ...makeAppt("6", "2026-10-08T08:00:00-03:00", 10), ...offGrid },
                { ...makeAppt("7", "2026-10-08T08:00:00-03:00", 20), ...offGrid },
            ])

            expect(conflicts).toEqual([])
        })
    })
})
