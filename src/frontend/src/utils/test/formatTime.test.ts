import { describe, expect, it } from "vitest"
import formatTime from "@/utils/formatTime"

describe("formatTime", () => {
    it("mostra hora e minuto no horário de Brasília", () => {
        expect(formatTime(new Date("2026-10-15T13:05:00.000Z"))).toBe("10:05")
    })

    it("usa 24 horas", () => {
        expect(formatTime(new Date("2026-10-15T22:30:00.000Z"))).toBe("19:30")
    })
})
