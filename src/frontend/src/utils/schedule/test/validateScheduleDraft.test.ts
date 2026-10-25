import { describe, expect, it } from "vitest"
import buildScheduleConfig from "@/testUtils/buildScheduleConfig"
import type ScheduleDraft from "@/types/schedule/ScheduleDraft.types"
import toScheduleDraft from "@/utils/schedule/toScheduleDraft"
import validateScheduleDraft from "@/utils/schedule/validateScheduleDraft"

function draftWith(overrides: Partial<ScheduleDraft> = {}): ScheduleDraft {
    return { ...toScheduleDraft(buildScheduleConfig()), ...overrides }
}

function withMondayRanges(ranges: { startTime: string; endTime: string }[], enabled = true) {
    const draft = draftWith()
    draft.days[0] = { ...draft.days[0], enabled, ranges }

    return draft
}

describe("validateScheduleDraft", () => {
    it("não acusa nada na configuração salva", () => {
        expect(validateScheduleDraft(draftWith())).toEqual({ ranges: {}, fields: {}, count: 0 })
    })

    it.each([
        ["sem início", { startTime: "", endTime: "11:30" }],
        ["sem fim", { startTime: "08:30", endTime: "" }]
    ])("pede início e fim na faixa %s", (_label, range) => {
        const errors = validateScheduleDraft(withMondayRanges([range]))

        expect(errors.ranges["1.0"]).toEqual({ code: "rangeMissing" })
    })

    it("acusa o fim que não é depois do início", () => {
        const errors = validateScheduleDraft(
            withMondayRanges([{ startTime: "10:00", endTime: "10:00" }])
        )

        expect(errors.ranges["1.0"]).toEqual({ code: "rangeEndBeforeStart" })
    })

    it("acusa a sobreposição na faixa que começa depois, como o servidor", () => {
        const errors = validateScheduleDraft(
            withMondayRanges([
                { startTime: "10:00", endTime: "12:00" },
                { startTime: "08:00", endTime: "11:00" }
            ])
        )

        expect(errors.ranges).toEqual({ "1.0": { code: "rangeOverlap" } })
    })

    it("acusa a faixa menor que a duração e reavalia quando a duração muda", () => {
        const draft = withMondayRanges([{ startTime: "08:00", endTime: "08:40" }])

        const withThirty = validateScheduleDraft(draft)
        const withSixty = validateScheduleDraft({ ...draft, slotMinutes: 60 })

        expect(withThirty.ranges["1.0"]).toBeUndefined()
        expect(withSixty.ranges["1.0"]).toEqual({ code: "rangeTooShort", minutes: 60 })
    })

    it("não conta as faixas com erro de um dia desligado", () => {
        const errors = validateScheduleDraft(
            withMondayRanges([{ startTime: "", endTime: "" }], false)
        )

        expect(errors.count).toBe(0)
    })

    it.each([
        ["seatsPerSlot", "0", "seatsOutOfRange"],
        ["seatsPerSlot", "21", "seatsOutOfRange"],
        ["seatsPerSlot", "2.5", "seatsNotInteger"],
        ["seatsPerSlot", "2,5", "seatsNotInteger"],
        ["windowDays", "2.5", "windowNotInteger"],
        ["waitAlertDays", "3.5", "waitAlertNotInteger"],
        ["seatsPerSlot", " 3", "seatsOutOfRange"],
        ["windowDays", "", "windowOutOfRange"],
        ["windowDays", "181", "windowOutOfRange"],
        ["waitAlertDays", "0", "waitAlertOutOfRange"],
        ["waitAlertDays", "61", "waitAlertOutOfRange"]
    ] as const)("acusa %s com o valor %j", (field, value, code) => {
        const errors = validateScheduleDraft(draftWith({ [field]: value }))

        expect(errors.fields[field]).toEqual({ code })
        expect(errors.count).toBe(1)
    })

    it.each([
        ["seatsPerSlot", "20"],
        ["windowDays", "180"],
        ["waitAlertDays", "1"]
    ] as const)("aceita %s no limite %s", (field, value) => {
        expect(validateScheduleDraft(draftWith({ [field]: value })).count).toBe(0)
    })

    it("pede o endereço e limita endereço e complemento a 500 caracteres", () => {
        expect(validateScheduleDraft(draftWith({ unitAddress: "   " })).fields.unitAddress).toEqual(
            {
                code: "addressRequired"
            }
        )
        expect(
            validateScheduleDraft(draftWith({ unitAddress: "a".repeat(501) })).fields.unitAddress
        ).toEqual({ code: "addressTooLong" })
        expect(
            validateScheduleDraft(draftWith({ unitAddressComplement: "a".repeat(501) })).fields
                .unitAddressComplement
        ).toEqual({ code: "complementTooLong" })
        expect(validateScheduleDraft(draftWith({ unitAddress: "a".repeat(500) })).count).toBe(0)
    })

    it("soma os erros das faixas e dos campos", () => {
        const draft = withMondayRanges([{ startTime: "", endTime: "" }])

        expect(validateScheduleDraft({ ...draft, seatsPerSlot: "0" }).count).toBe(2)
    })
})
