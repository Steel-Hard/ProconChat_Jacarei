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
})
