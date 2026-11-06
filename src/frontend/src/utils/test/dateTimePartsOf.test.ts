import { describe, expect, it } from "vitest"
import dateTimePartsOf from "@/utils/dateTimePartsOf"

describe("dateTimePartsOf", () => {
    it("devolve null quando não há valor", () => {
        expect(dateTimePartsOf(null)).toBeNull()
    })

    it("devolve null quando o valor não é data", () => {
        expect(dateTimePartsOf("nao-e-data")).toBeNull()
    })

    it("separa a data e a hora de Brasília de um timestamp", () => {
        expect(dateTimePartsOf("2026-11-04T14:00:00.000Z")).toEqual({
            date: "04/11/2026",
            time: "11:00"
        })
    })
})
