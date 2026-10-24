import { describe, expect, it } from "vitest"
import buildScheduleConfig from "@/testUtils/buildScheduleConfig"
import fieldOfIssuePath from "@/utils/schedule/fieldOfIssuePath"
import toScheduleDraft from "@/utils/schedule/toScheduleDraft"
import toScheduleInput from "@/utils/schedule/toScheduleInput"

describe("fieldOfIssuePath", () => {
    it("liga ranges.N à faixa certa do rascunho com faixas fora de ordem e um dia desligado antes", () => {
        const draft = toScheduleDraft(buildScheduleConfig())
        draft.days[0] = { ...draft.days[0], enabled: false }
        draft.days[1] = { ...draft.days[1], ranges: draft.days[1].ranges.toReversed() }
        const origins = toScheduleInput(draft)

        expect(fieldOfIssuePath("ranges.0.endTime", origins)).toEqual({
            kind: "range",
            weekday: 2,
            rangeIndex: 1
        })
        expect(fieldOfIssuePath("ranges.1.startTime", origins)).toEqual({
            kind: "range",
            weekday: 2,
            rangeIndex: 0
        })
    })

    it("liga blockedDates.N ao bloqueio do rascunho", () => {
        expect(
            fieldOfIssuePath("blockedDates.0.description", { rangeOrigins: [], blockOrigins: [0] })
        ).toEqual({ kind: "block", blockIndex: 0 })
    })

    it("liga os campos de topo", () => {
        expect(fieldOfIssuePath("unitAddress", { rangeOrigins: [], blockOrigins: [] })).toEqual({
            kind: "field",
            field: "unitAddress"
        })
    })

    it.each(["ranges.9.endTime", "blockedDates.4.date", "ranges", "outro.0", "config.unitAddress"])(
        "devolve null para o caminho desconhecido %s",
        (path) => {
            expect(fieldOfIssuePath(path, { rangeOrigins: [], blockOrigins: [] })).toBeNull()
        }
    )
})
