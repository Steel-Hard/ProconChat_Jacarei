import { describe, expect, test } from "vitest"
import configuracaoInicial from "./configuracao-inicial.data"

const toMinutes = (time: string): number => {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time)
    if (!match) {
        throw new Error(`Horário inválido: ${time}`)
    }
    return Number(match[1]) * 60 + Number(match[2])
}

const expectValidDocuments = (documents: string[]): void => {
    expect(documents.length).toBeGreaterThan(0)
    for (const document of documents) {
        expect(document.length).toBeGreaterThan(0)
        expect([...document].length).toBeLessThanOrEqual(255)
        expect(document).toBe(document.trim())
    }
    expect(new Set(documents).size).toBe(documents.length)
}

describe("configuracao-inicial.data", () => {
    test("valores dentro dos domínios de ScheduleSettings", () => {
        expect([20, 30, 40, 60]).toContain(configuracaoInicial.slotMinutes)
        expect(configuracaoInicial.seatsPerSlot).toBeGreaterThanOrEqual(1)
        expect(configuracaoInicial.seatsPerSlot).toBeLessThanOrEqual(20)
        expect(configuracaoInicial.windowDays).toBeGreaterThanOrEqual(1)
        expect(configuracaoInicial.windowDays).toBeLessThanOrEqual(180)
        expect([0, 1, 2, 3, 5]).toContain(configuracaoInicial.minNoticeDays)
        expect(configuracaoInicial.waitAlertDays).toBeGreaterThanOrEqual(1)
        expect(configuracaoInicial.waitAlertDays).toBeLessThanOrEqual(60)
        expect([2, 6, 12, 24, 48]).toContain(configuracaoInicial.reminderHours)
        expect(configuracaoInicial.unitAddress.length).toBeGreaterThan(0)
        expect(configuracaoInicial.unitAddress).toBe(configuracaoInicial.unitAddress.trim())
    })

    test("lembrete desligado", () => {
        expect(configuracaoInicial.reminderEnabled).toBe(false)
    })

    test("faixas válidas, sem sobreposição e comportando ao menos um atendimento", () => {
        const byWeekday = new Map<number, { slotIndex: number; start: number; end: number }[]>()
        for (const range of configuracaoInicial.scheduleRanges) {
            expect(Number.isInteger(range.weekday)).toBe(true)
            expect(range.weekday).toBeGreaterThanOrEqual(0)
            expect(range.weekday).toBeLessThanOrEqual(6)
            expect(Number.isInteger(range.slotIndex)).toBe(true)
            expect(range.slotIndex).toBeGreaterThanOrEqual(1)
            expect(range.slotIndex).toBeLessThanOrEqual(3)
            const start = toMinutes(range.startTime)
            const end = toMinutes(range.endTime)
            expect(end).toBeGreaterThan(start)
            expect(end - start).toBeGreaterThanOrEqual(configuracaoInicial.slotMinutes)
            const ranges = byWeekday.get(range.weekday) ?? []
            ranges.push({ slotIndex: range.slotIndex, start, end })
            byWeekday.set(range.weekday, ranges)
        }
        for (const [weekday, ranges] of byWeekday) {
            expect(ranges.length, `weekday ${weekday}`).toBeLessThanOrEqual(3)
            const indexes = ranges.map((range) => range.slotIndex)
            expect(new Set(indexes).size, `weekday ${weekday}`).toBe(indexes.length)
            const sorted = [...ranges].sort((a, b) => a.start - b.start)
            for (let i = 1; i < sorted.length; i++) {
                expect(sorted[i]!.start, `weekday ${weekday}`).toBeGreaterThanOrEqual(sorted[i - 1]!.end)
            }
        }
    })

    test("documentos dos dois grupos válidos", () => {
        expectValidDocuments(configuracaoInicial.attendanceDocuments.holder)
        expectValidDocuments(configuracaoInicial.attendanceDocuments.representative)
    })
})
