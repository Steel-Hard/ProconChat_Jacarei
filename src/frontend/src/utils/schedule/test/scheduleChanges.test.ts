import { describe, expect, it } from "vitest"
import buildScheduleConfig from "@/testUtils/buildScheduleConfig"
import scheduleChanges from "@/utils/schedule/scheduleChanges"
import toScheduleDraft from "@/utils/schedule/toScheduleDraft"

const PARTIAL = { date: "2026-11-20", startTime: "08:30", endTime: "10:00", description: "Reunião" }

describe("scheduleChanges", () => {
    it("não acusa alteração no rascunho igual ao salvo", () => {
        const saved = buildScheduleConfig()

        expect(scheduleChanges(toScheduleDraft(saved), saved)).toEqual([])
    })

    it("lista as alterações na ordem dos rótulos", () => {
        const saved = buildScheduleConfig()
        const draft = {
            ...toScheduleDraft(saved),
            reminderHours: 48 as const,
            seatsPerSlot: "3",
            unitAddressComplement: "",
            slotMinutes: 20 as const
        }

        expect(scheduleChanges(draft, saved)).toEqual([
            "slotMinutes",
            "seatsPerSlot",
            "unitAddressComplement",
            "reminderHours"
        ])
    })

    it("acusa a remoção de um bloqueio parcial em datas bloqueadas", () => {
        const saved = buildScheduleConfig({ blockedDates: [PARTIAL] })
        const draft = { ...toScheduleDraft(saved), blockedDates: [] }

        expect(scheduleChanges(draft, saved)).toEqual(["blockedDates"])
    })

    it("não acusa alteração ao desligar e religar um dia", () => {
        const saved = buildScheduleConfig()
        const draft = toScheduleDraft(saved)
        const monday = draft.days[0]
        draft.days[0] = { ...monday, enabled: false }
        const off = scheduleChanges(draft, saved)
        draft.days[0] = { ...monday, enabled: true }

        expect(off).toEqual(["weeklyGrid"])
        expect(scheduleChanges(draft, saved)).toEqual([])
    })

    it("não acusa alteração quando as faixas estão fora de ordem", () => {
        const saved = buildScheduleConfig()
        const draft = toScheduleDraft(saved)
        draft.days[0] = { ...draft.days[0], ranges: draft.days[0].ranges.toReversed() }

        expect(scheduleChanges(draft, saved)).toEqual([])
    })
})
