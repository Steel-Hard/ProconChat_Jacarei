import { describe, expect, it } from "vitest"
import appointmentHasPassed from "@/utils/appointmentHasPassed"

const START = "2026-10-19T11:00:00.000Z"

describe("appointmentHasPassed", () => {
    it("é falso antes do horário", () => {
        expect(appointmentHasPassed(START, Date.parse("2026-10-19T10:59:59.999Z"))).toBe(false)
    })

    it("é verdadeiro no instante exato do horário", () => {
        expect(appointmentHasPassed(START, Date.parse(START))).toBe(true)
    })

    it("é verdadeiro depois do horário", () => {
        expect(appointmentHasPassed(START, Date.parse("2026-10-19T11:00:00.001Z"))).toBe(true)
    })

    it("não considera passado um horário inválido", () => {
        expect(appointmentHasPassed("invalido", Date.parse(START))).toBe(false)
    })
})
