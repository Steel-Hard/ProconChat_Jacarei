import { describe, expect, it } from "vitest"
import BadRequestError from "../errors/BadRequestError"
import { buildScheduleConfigInput as baseInput } from "./mock/scheduleConfig.builders"
import { normalizeAndValidateScheduleConfig } from "./scheduleRules"

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

        it("rejeita índice de faixa repetido no mesmo dia", () => {
            expect(() =>
                normalizeAndValidateScheduleConfig(
                    baseInput({
                        ranges: [
                            { weekday: 1, slotIndex: 1, startTime: "08:00", endTime: "11:00" },
                            { weekday: 1, slotIndex: 1, startTime: "13:00", endTime: "17:00" },
                        ],
                    }),
                ),
            ).toThrow("Índice de faixa repetido no mesmo dia")
        })

        it("troca complemento vazio por null e ordena os bloqueios por data e horário inicial", () => {
            const normalized = normalizeAndValidateScheduleConfig(
                baseInput({
                    unitAddressComplement: "   ",
                    blockedDates: [
                        { date: "2026-10-20", startTime: "14:00", endTime: "15:00", description: "Reunião" },
                        { date: "2026-10-13", description: "Feriado" },
                        { date: "2026-10-20", startTime: "08:00", endTime: "09:00", description: "Treinamento" },
                    ],
                }),
            )

            expect(normalized.unitAddressComplement).toBeNull()
            expect(normalized.blockedDates).toEqual([
                { date: "2026-10-13", startTime: null, endTime: null, description: "Feriado" },
                { date: "2026-10-20", startTime: "08:00", endTime: "09:00", description: "Treinamento" },
                { date: "2026-10-20", startTime: "14:00", endTime: "15:00", description: "Reunião" },
            ])
        })
    })
})
