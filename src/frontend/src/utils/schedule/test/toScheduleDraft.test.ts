import { describe, expect, it } from "vitest"
import buildScheduleConfig from "@/testUtils/buildScheduleConfig"
import toScheduleDraft from "@/utils/schedule/toScheduleDraft"

describe("toScheduleDraft", () => {
    it("monta os 7 dias de segunda a domingo, ligando só os que têm faixa", () => {
        const draft = toScheduleDraft(buildScheduleConfig())

        expect(draft.days.map((day) => [day.weekday, day.enabled])).toEqual([
            [1, true],
            [2, true],
            [3, true],
            [4, true],
            [5, true],
            [6, false],
            [0, false]
        ])
    })

    it("ordena as faixas de cada dia pelo início", () => {
        const draft = toScheduleDraft(
            buildScheduleConfig({
                ranges: [
                    { weekday: 1, slotIndex: 2, startTime: "13:00", endTime: "17:00" },
                    { weekday: 1, slotIndex: 1, startTime: "08:00", endTime: "12:00" }
                ]
            })
        )

        expect(draft.days[0].ranges).toEqual([
            { startTime: "08:00", endTime: "12:00" },
            { startTime: "13:00", endTime: "17:00" }
        ])
    })

    it("guarda os números como texto e o complemento nulo como texto vazio", () => {
        const draft = toScheduleDraft(buildScheduleConfig({ unitAddressComplement: null }))

        expect(draft.seatsPerSlot).toBe("2")
        expect(draft.windowDays).toBe("30")
        expect(draft.waitAlertDays).toBe("7")
        expect(draft.unitAddressComplement).toBe("")
    })
})
