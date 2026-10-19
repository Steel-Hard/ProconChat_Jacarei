import { describe, expect, it } from "vitest"
import { renderHook } from "@testing-library/react"
import useMediaQuery from "@/hooks/useMediaQuery"

describe("useMediaQuery", () => {
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
