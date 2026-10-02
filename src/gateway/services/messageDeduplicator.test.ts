import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { MemoryMessageDeduplicator } from "./messageDeduplicator"

describe("MemoryMessageDeduplicator", () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2026-10-02T12:00:00Z"))
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    test("marca o id na primeira vez e acusa duplicada na segunda dentro do TTL", () => {
        const deduplicator = new MemoryMessageDeduplicator(1000)

        const first = deduplicator.isDuplicate("wamid.1")
        const second = deduplicator.isDuplicate("wamid.1")

        expect(first).toBe(false)
        expect(second).toBe(true)
    })

    test("aceita o mesmo id de novo depois que o TTL expira", () => {
        const deduplicator = new MemoryMessageDeduplicator(1000)
        deduplicator.isDuplicate("wamid.1")

        vi.advanceTimersByTime(1000)

        expect(deduplicator.isDuplicate("wamid.1")).toBe(false)
    })

    test("forget libera o id e a proxima consulta nao acusa duplicada", () => {
        const deduplicator = new MemoryMessageDeduplicator(1000)
        deduplicator.isDuplicate("wamid.1")

        deduplicator.forget("wamid.1")

        expect(deduplicator.isDuplicate("wamid.1")).toBe(false)
    })

    test("clear esquece todos os ids marcados", () => {
        const deduplicator = new MemoryMessageDeduplicator(1000)
        deduplicator.isDuplicate("wamid.1")
        deduplicator.isDuplicate("wamid.2")

        deduplicator.clear()

        expect(deduplicator.isDuplicate("wamid.1")).toBe(false)
        expect(deduplicator.isDuplicate("wamid.2")).toBe(false)
    })
})
