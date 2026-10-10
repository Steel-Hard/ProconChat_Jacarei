import { describe, expect, it } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { useCompactTable, useIsDocked, useMediaQuery } from "@/hooks/useMediaQuery"
import { mockMatchMedia, setViewportWidth } from "@/testUtils/mockMatchMedia"

describe("useMediaQuery", () => {
    it("encaixa o menu com viewport de 1440 px", () => {
        mockMatchMedia(1440)

        const { result } = renderHook(() => useIsDocked())

        expect(result.current).toBe(true)
    })

    it("não encaixa o menu com viewport de 1199 px", () => {
        mockMatchMedia(1199)

        const { result } = renderHook(() => useIsDocked())

        expect(result.current).toBe(false)
    })

    it("usa a tabela compacta com viewport de 1431 px", () => {
        mockMatchMedia(1431)

        const { result } = renderHook(() => useCompactTable())

        expect(result.current).toBe(true)
    })

    it("usa a tabela larga com viewport de 1432 px", () => {
        mockMatchMedia(1432)

        const { result } = renderHook(() => useCompactTable())

        expect(result.current).toBe(false)
    })

    it("atualiza quando a viewport cruza o limite", () => {
        mockMatchMedia(1440)
        const { result } = renderHook(() => useCompactTable())
        expect(result.current).toBe(false)

        act(() => setViewportWidth(1300))

        expect(result.current).toBe(true)
    })

    it("devolve false quando o navegador não tem matchMedia", () => {
        Object.defineProperty(window, "matchMedia", {
            value: undefined,
            configurable: true,
            writable: true
        })

        const { result } = renderHook(() => useMediaQuery("(min-width: 1200px)"))

        expect(result.current).toBe(false)
    })
})
