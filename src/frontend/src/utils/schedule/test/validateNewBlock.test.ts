import { describe, expect, it } from "vitest"
import validateNewBlock from "@/utils/schedule/validateNewBlock"

const BLOCKS = [
    { date: "2026-11-02", startTime: null, endTime: null, description: "Finados" },
    { date: "2026-11-20", startTime: "08:30", endTime: "10:00", description: "Reunião" }
]

describe("validateNewBlock", () => {
    it("aceita data livre com descrição", () => {
        expect(validateNewBlock(BLOCKS, { date: "2026-11-05", description: "Ponto" })).toBeNull()
    })

    it("pede a data", () => {
        expect(validateNewBlock(BLOCKS, { date: "", description: "Ponto" })).toEqual({
            code: "dateRequired"
        })
    })

    it.each(["2026-11-02", "2026-11-20"])("recusa a data %s que já tem bloqueio", (date) => {
        expect(validateNewBlock(BLOCKS, { date, description: "Ponto" })).toEqual({
            code: "dateAlreadyBlocked"
        })
    })

    it("pede a descrição sem contar os espaços", () => {
        expect(validateNewBlock(BLOCKS, { date: "2026-11-05", description: "  " })).toEqual({
            code: "descriptionRequired"
        })
    })

    it("limita a descrição a 150 caracteres sem contar os espaços das pontas", () => {
        expect(
            validateNewBlock(BLOCKS, { date: "2026-11-05", description: "a".repeat(151) })
        ).toEqual({ code: "descriptionTooLong" })
        expect(
            validateNewBlock(BLOCKS, {
                date: "2026-11-05",
                description: ` ${"a".repeat(150)} `
            })
        ).toBeNull()
    })

    describe("bloqueio de período", () => {
        const PERIOD_DATE = "2026-11-05"
        const MORNING = { startTime: "08:00", endTime: "12:00" }

        function periodBlock(startTime: string, endTime: string, date = PERIOD_DATE) {
            return { date, description: "Reunião", fullDay: false, startTime, endTime }
        }

        function morningBlocks() {
            return [{ date: PERIOD_DATE, ...MORNING, description: "Manhã" }]
        }

        it("aceita período com início antes do fim", () => {
            expect(validateNewBlock(BLOCKS, periodBlock("13:00", "16:00"))).toBeNull()
        })

        it("recusa período com o fim antes do início", () => {
            expect(validateNewBlock(BLOCKS, periodBlock("16:00", "13:00"))).toEqual({
                code: "periodInvalid"
            })
        })

        it("recusa período com o fim igual ao início", () => {
            expect(validateNewBlock(BLOCKS, periodBlock("13:00", "13:00"))).toEqual({
                code: "periodInvalid"
            })
        })

        it("recusa período com só o início preenchido", () => {
            expect(validateNewBlock(BLOCKS, periodBlock("13:00", ""))).toEqual({
                code: "periodRequired"
            })
        })

        it("recusa período com só o fim preenchido", () => {
            expect(validateNewBlock(BLOCKS, periodBlock("", "16:00"))).toEqual({
                code: "periodRequired"
            })
        })

        it("recusa período sem início e sem fim", () => {
            expect(validateNewBlock(BLOCKS, periodBlock("", ""))).toEqual({
                code: "periodRequired"
            })
        })

        it("ignora os horários quando o dia inteiro está marcado", () => {
            expect(
                validateNewBlock(BLOCKS, {
                    date: PERIOD_DATE,
                    description: "Feriado",
                    fullDay: true,
                    startTime: "16:00",
                    endTime: "13:00"
                })
            ).toBeNull()
        })

        it("aceita dois períodos na mesma data sem sobreposição", () => {
            expect(validateNewBlock(morningBlocks(), periodBlock("13:00", "17:00"))).toBeNull()
        })

        it("aceita período que começa quando o outro termina", () => {
            expect(validateNewBlock(morningBlocks(), periodBlock("12:00", "14:00"))).toBeNull()
        })

        it.each([
            ["começa no meio", "10:00", "14:00"],
            ["termina no meio", "07:00", "09:00"],
            ["está dentro", "09:00", "10:00"],
            ["engloba", "07:00", "13:00"],
            ["é idêntico", "08:00", "12:00"]
        ])("recusa período que %s de outro da mesma data", (_, startTime, endTime) => {
            expect(validateNewBlock(morningBlocks(), periodBlock(startTime, endTime))).toEqual({
                code: "periodOverlap"
            })
        })

        it("recusa período em data que já tem bloqueio de dia inteiro", () => {
            expect(validateNewBlock(BLOCKS, periodBlock("13:00", "16:00", "2026-11-02"))).toEqual({
                code: "dateAlreadyBlocked"
            })
        })

        it("recusa dia inteiro em data que já tem bloqueio de período", () => {
            expect(
                validateNewBlock(morningBlocks(), { date: PERIOD_DATE, description: "Feriado" })
            ).toEqual({ code: "dateAlreadyBlocked" })
        })

        it("não compara o período com bloqueios de outras datas", () => {
            expect(
                validateNewBlock(morningBlocks(), periodBlock("08:00", "12:00", "2026-11-06"))
            ).toBeNull()
        })
    })
})
