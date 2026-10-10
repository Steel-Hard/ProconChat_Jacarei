import { describe, expect, it } from "vitest"
import { act, renderHook } from "@testing-library/react"
import useCompactTable from "@/hooks/useCompactTable"
import mockMatchMedia from "@/testUtils/mockMatchMedia"
import setViewportWidth from "@/testUtils/setViewportWidth"

describe("useCompactTable", () => {
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
})
