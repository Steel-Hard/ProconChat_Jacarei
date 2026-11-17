import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import useDebouncedValue from "@/hooks/useDebouncedValue"

describe("useDebouncedValue", () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it("começa com o valor inicial", () => {
        const { result } = renderHook(() => useDebouncedValue("a", 300))

        expect(result.current).toBe("a")
    })

    it("só publica o último valor depois do atraso", () => {
        const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
            initialProps: { value: "a" }
        })

        rerender({ value: "b" })
        act(() => {
            vi.advanceTimersByTime(200)
        })
        rerender({ value: "c" })
        act(() => {
            vi.advanceTimersByTime(200)
        })
        expect(result.current).toBe("a")

        act(() => {
            vi.advanceTimersByTime(100)
        })
        expect(result.current).toBe("c")
    })
})
