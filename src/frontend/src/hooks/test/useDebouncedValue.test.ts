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

    it("publica na hora o primeiro valor quando o anterior pede publicação imediata", () => {
        const { result, rerender } = renderHook(
            ({ value }) =>
                useDebouncedValue<string | null>(value, 300, (current) => current === null),
            { initialProps: { value: null as string | null } }
        )

        rerender({ value: "a" })
        expect(result.current).toBe("a")

        rerender({ value: "b" })
        expect(result.current).toBe("a")
        act(() => {
            vi.advanceTimersByTime(300)
        })
        expect(result.current).toBe("b")
    })

    it("sem a condição de publicação imediata, o primeiro valor também espera", () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebouncedValue<string | null>(value, 300),
            { initialProps: { value: null as string | null } }
        )

        rerender({ value: "a" })
        expect(result.current).toBeNull()
    })
})
