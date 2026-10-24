import { describe, expect, it } from "vitest"
import buildScheduleConfig from "@/testUtils/buildScheduleConfig"
import toScheduleDraft from "@/utils/schedule/toScheduleDraft"
import toScheduleInput from "@/utils/schedule/toScheduleInput"

const PARTIAL_AND_PAST = [
    { date: "2026-01-01", startTime: null, endTime: null, description: "Confraternização" },
    { date: "2026-11-20", startTime: "08:30", endTime: "10:00", description: "Reunião" }
]

describe("toScheduleInput", () => {
    it("reproduz o GET na ida e volta, inclusive bloqueio parcial e passado", () => {
        const config = buildScheduleConfig({ blockedDates: PARTIAL_AND_PAST })

        const { input } = toScheduleInput(toScheduleDraft(config))

        expect(input).toEqual({
            slotMinutes: config.slotMinutes,
            seatsPerSlot: config.seatsPerSlot,
            windowDays: config.windowDays,
            minNoticeDays: config.minNoticeDays,
            waitAlertDays: config.waitAlertDays,
            unitAddress: config.unitAddress,
            unitAddressComplement: config.unitAddressComplement,
            reminderEnabled: config.reminderEnabled,
            reminderHours: config.reminderHours,
            ranges: config.ranges.map(({ weekday, startTime, endTime }) => ({
                weekday,
                startTime,
                endTime
            })),
            blockedDates: PARTIAL_AND_PAST
        })
    })

    it("leva só as faixas dos dias ligados, ordenadas pelo início", () => {
        const draft = toScheduleDraft(buildScheduleConfig())
        draft.days[0] = { ...draft.days[0], enabled: false }
        draft.days[1] = {
            ...draft.days[1],
            ranges: [
                { startTime: "13:30", endTime: "16:30" },
                { startTime: "08:30", endTime: "11:30" }
            ]
        }

        const { input, rangeOrigins } = toScheduleInput(draft)

        expect(input.ranges.some((range) => range.weekday === 1)).toBe(false)
        expect(input.ranges.slice(0, 2)).toEqual([
            { weekday: 2, startTime: "08:30", endTime: "11:30" },
            { weekday: 2, startTime: "13:30", endTime: "16:30" }
        ])
        expect(rangeOrigins.slice(0, 2)).toEqual([
            { weekday: 2, rangeIndex: 1 },
            { weekday: 2, rangeIndex: 0 }
        ])
    })

    it("troca o complemento vazio por nulo e tira os espaços do endereço", () => {
        const draft = {
            ...toScheduleDraft(buildScheduleConfig()),
            unitAddress: "  Rua do Procon, 100  ",
            unitAddressComplement: "   "
        }

        const { input } = toScheduleInput(draft)

        expect(input.unitAddress).toBe("Rua do Procon, 100")
        expect(input.unitAddressComplement).toBeNull()
    })

    it("liga cada bloqueio do corpo à posição dele no rascunho", () => {
        const draft = toScheduleDraft(buildScheduleConfig({ blockedDates: PARTIAL_AND_PAST }))

        expect(toScheduleInput(draft).blockOrigins).toEqual([0, 1])
    })
})
