import { describe, expect, it } from "vitest"
import BadRequestError from "../errors/BadRequestError"
import { buildDefaultScheduleConfigView } from "../repositories/mock/scheduleStub.repository"
import { FutureActiveAppointment, ScheduleConfigInput } from "../types/schedule.types"
import {
    calculateMonthlyPreview,
    detectScheduleConflicts,
    normalizeAndValidateScheduleConfig,
} from "./scheduleRules"

function baseInput(overrides: Partial<ScheduleConfigInput> = {}): ScheduleConfigInput {
    const def = buildDefaultScheduleConfigView()
    return {
        slotMinutes: def.slotMinutes,
        seatsPerSlot: def.seatsPerSlot,
        windowDays: def.windowDays,
        minNoticeDays: def.minNoticeDays,
        waitAlertDays: def.waitAlertDays,
        unitAddress: def.unitAddress,
        unitAddressComplement: def.unitAddressComplement,
        reminderEnabled: def.reminderEnabled,
        reminderHours: def.reminderHours,
        ranges: def.ranges,
        blockedDates: def.blockedDates,
        ...overrides,
    }
}

describe("scheduleRules", () => {
    describe("normalizeAndValidateScheduleConfig", () => {
        it("ordena faixas do mesmo dia por horário de início e renumera slotIndex de 1 a 3", () => {
            const normalized = normalizeAndValidateScheduleConfig(
                baseInput({
                    ranges: [
                        { weekday: 1, startTime: "14:00", endTime: "17:00" },
                        { weekday: 1, startTime: "08:00", endTime: "11:00" },
                        { weekday: 1, startTime: "11:30", endTime: "13:00" },
                    ],
                }),
            )

            expect(normalized.ranges).toEqual([
                { weekday: 1, slotIndex: 1, startTime: "08:00", endTime: "11:00" },
                { weekday: 1, slotIndex: 2, startTime: "11:30", endTime: "13:00" },
                { weekday: 1, slotIndex: 3, startTime: "14:00", endTime: "17:00" },
            ])
        })

        it("rejeita mais de 3 faixas de horário no mesmo dia da semana", () => {
            expect(() =>
                normalizeAndValidateScheduleConfig(
                    baseInput({
                        ranges: [
                            { weekday: 1, startTime: "08:00", endTime: "09:00" },
                            { weekday: 1, startTime: "09:30", endTime: "10:30" },
                            { weekday: 1, startTime: "11:00", endTime: "12:00" },
                            { weekday: 1, startTime: "13:00", endTime: "14:00" },
                        ],
                    }),
                ),
            ).toThrow(BadRequestError)
        })

        it("rejeita faixa em que o horário final não é posterior ao inicial", () => {
            expect(() =>
                normalizeAndValidateScheduleConfig(
                    baseInput({
                        ranges: [{ weekday: 1, startTime: "12:00", endTime: "12:00" }],
                    }),
                ),
            ).toThrow("O fim deve ser depois do início")
        })

        it("rejeita faixa menor que a duração configurada do atendimento", () => {
            expect(() =>
                normalizeAndValidateScheduleConfig(
                    baseInput({
                        slotMinutes: 60,
                        ranges: [{ weekday: 1, startTime: "08:00", endTime: "08:40" }],
                    }),
                ),
            ).toThrow("Esta faixa não comporta nenhum atendimento de 60 minutos")
        })

        it("rejeita faixas sobrepostas no mesmo dia da semana", () => {
            expect(() =>
                normalizeAndValidateScheduleConfig(
                    baseInput({
                        ranges: [
                            { weekday: 2, startTime: "08:00", endTime: "12:00" },
                            { weekday: 2, startTime: "11:30", endTime: "15:00" },
                        ],
                    }),
                ),
            ).toThrow("Esta faixa se sobrepõe a outra faixa do mesmo dia")
        })

        it("rejeita bloqueios duplicados ou sobrepostos na mesma data", () => {
            expect(() =>
                normalizeAndValidateScheduleConfig(
                    baseInput({
                        blockedDates: [
                            { date: "2026-10-12", description: "Feriado Nacional" },
                            {
                                date: "2026-10-12",
                                startTime: "14:00",
                                endTime: "16:00",
                                description: "Manutenção",
                            },
                        ],
                    }),
                ),
            ).toThrow("Esta data já tem um bloqueio")

            expect(() =>
                normalizeAndValidateScheduleConfig(
                    baseInput({
                        blockedDates: [
                            {
                                date: "2026-10-13",
                                startTime: "13:00",
                                endTime: "15:00",
                                description: "Reunião 1",
                            },
                            {
                                date: "2026-10-13",
                                startTime: "14:30",
                                endTime: "16:00",
                                description: "Reunião 2",
                            },
                        ],
                    }),
                ),
            ).toThrow("Período bloqueado sobreposto na mesma data")
        })
    })

    describe("detectScheduleConflicts", () => {
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

        it("detecta todos os 6 tipos de conflito (DATE_BLOCKED, PERIOD_BLOCKED, DAY_WITHOUT_SERVICE, DURATION_CHANGED, RANGE_CHANGED, SEATS_REDUCED)", () => {
            const config = normalizeAndValidateScheduleConfig(
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

            const appointments: FutureActiveAppointment[] = [
                makeAppt("1", "2026-10-06T08:00:00-03:00", 1),
                makeAppt("2", "2026-10-08T10:00:00-03:00", 2),
                makeAppt("3", "2026-10-09T08:00:00-03:00", 3),
                makeAppt("4", "2026-10-07T09:30:00-03:00", 4),
                makeAppt("5", "2026-10-07T08:00:00-03:00", 5),
                makeAppt("6", "2026-10-08T08:00:00-03:00", 10),
                makeAppt("7", "2026-10-08T08:00:00-03:00", 20),
            ]

            const conflicts = detectScheduleConflicts(config, appointments)
            const byId = new Map(conflicts.map((c) => [c.id, c]))

            expect(byId.get("1")?.code).toBe("DATE_BLOCKED")
            expect(byId.get("1")?.reason).toBe("Data bloqueada: Feriado Municipal")

            expect(byId.get("2")?.code).toBe("PERIOD_BLOCKED")
            expect(byId.get("2")?.reason).toBe("Período bloqueado (10:00–12:00)")

            expect(byId.get("3")?.code).toBe("DAY_WITHOUT_SERVICE")
            expect(byId.get("3")?.reason).toBe("Dia sem atendimento na nova grade")

            expect(byId.get("4")?.code).toBe("DURATION_CHANGED")
            expect(byId.get("4")?.reason).toBe(
                "Horário deixou de existir com atendimentos de 60 minutos",
            )

            expect(byId.get("5")?.code).toBe("RANGE_CHANGED")
            expect(byId.get("5")?.reason).toBe("Faixa de horário removida ou alterada")

            expect(byId.has("6")).toBe(false)
            expect(byId.get("7")?.code).toBe("SEATS_REDUCED")
            expect(byId.get("7")?.reason).toBe(
                "Vagas reduzidas para 1; este horário tem 2 agendamentos",
            )
        })
    })

    describe("calculateMonthlyPreview", () => {
        it("classifica corretamente os dias do mês (PAST, BEFORE_MIN_NOTICE, BLOCKED, NO_SERVICE, AVAILABLE, FULL, OUTSIDE_WINDOW)", () => {
            const now = new Date("2026-10-05T09:00:00-03:00")
            const activeCounts = new Map<string, number>([
                [new Date("2026-10-07T08:00:00-03:00").toISOString(), 2],
            ])

            const preview = calculateMonthlyPreview({
                month: "2026-10",
                now,
                settings: {
                    slot_minutes: 60,
                    seats_per_slot: 2,
                    window_days: 5,
                    min_notice_days: 1,
                },
                ranges: [1, 2, 3, 4, 5].map((weekday) => ({
                    weekday,
                    slot_index: 1,
                    start_time: "08:00",
                    end_time: "09:00",
                })),
                blockedDates: [
                    {
                        date: "2026-10-08",
                        start_time: null,
                        end_time: null,
                        description: "Feriado",
                    },
                ],
                activeCounts,
            })

            const statusByDate = new Map(preview.days.map((d) => [d.date, d.status]))

            expect(statusByDate.get("2026-10-01")).toBe("PAST")
            expect(statusByDate.get("2026-10-04")).toBe("PAST")
            expect(statusByDate.get("2026-10-05")).toBe("BEFORE_MIN_NOTICE")
            expect(statusByDate.get("2026-10-06")).toBe("AVAILABLE")
            expect(statusByDate.get("2026-10-07")).toBe("FULL")
            expect(statusByDate.get("2026-10-08")).toBe("BLOCKED")
            expect(statusByDate.get("2026-10-10")).toBe("NO_SERVICE")
            expect(statusByDate.get("2026-10-15")).toBe("OUTSIDE_WINDOW")
        })
    })
})
