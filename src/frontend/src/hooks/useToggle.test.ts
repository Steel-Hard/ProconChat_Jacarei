import { describe, expect, it } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { useToggle } from "@/hooks/useToggle"

describe("useToggle", () => {
    it("começa como falso quando nenhum valor inicial é informado", () => {
        const { result } = renderHook(() => useToggle())

        expect(result.current[0]).toBe(false)
    })

    it("começa com o valor inicial informado", () => {
        const { result } = renderHook(() => useToggle(true))

        expect(result.current[0]).toBe(true)
    })

    it("inverte o valor a cada chamada de toggle", () => {
        const { result } = renderHook(() => useToggle())

        act(() => result.current[1]())
        expect(result.current[0]).toBe(true)

        act(() => result.current[1]())
        expect(result.current[0]).toBe(false)
    })

    it("mantém a mesma referência de toggle entre renders", () => {
        const { result, rerender } = renderHook(() => useToggle())
        const initialToggle = result.current[1]

        rerender()

        expect(result.current[1]).toBe(initialToggle)
    })
})
