import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import useNowMs from "@/hooks/useNowMs"

beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-19T10:00:00.000Z") })
})

afterEach(() => {
    vi.useRealTimers()
})

describe("useNowMs", () => {
    it("devolve a hora atual e a atualiza a cada 30 segundos", () => {
        const { result } = renderHook(() => useNowMs())
        const first = result.current

        expect(first).toBe(Date.parse("2026-10-19T10:00:00.000Z"))

        act(() => {
            vi.advanceTimersByTime(30_000)
        })

        expect(result.current).toBe(first + 30_000)
    })

    it("para de atualizar ao desmontar", () => {
        const { unmount } = renderHook(() => useNowMs())

        unmount()

        expect(vi.getTimerCount()).toBe(0)
    })
})
