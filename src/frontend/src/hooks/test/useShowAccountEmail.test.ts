import { describe, expect, it } from "vitest"
import { renderHook } from "@testing-library/react"
import useShowAccountEmail from "@/hooks/useShowAccountEmail"
import mockMatchMedia from "@/testUtils/mockMatchMedia"

describe("useShowAccountEmail", () => {
    it("mostra o e-mail a partir de 940 px", () => {
        mockMatchMedia(940)

        const { result } = renderHook(() => useShowAccountEmail())

        expect(result.current).toBe(true)
    })

    it("esconde o e-mail abaixo de 940 px", () => {
        mockMatchMedia(939)

        const { result } = renderHook(() => useShowAccountEmail())

        expect(result.current).toBe(false)
    })
})
