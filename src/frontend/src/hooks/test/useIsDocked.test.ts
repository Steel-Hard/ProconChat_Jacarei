import { describe, expect, it } from "vitest"
import { renderHook } from "@testing-library/react"
import useIsDocked from "@/hooks/useIsDocked"
import mockMatchMedia from "@/testUtils/mockMatchMedia"

describe("useIsDocked", () => {
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
})
