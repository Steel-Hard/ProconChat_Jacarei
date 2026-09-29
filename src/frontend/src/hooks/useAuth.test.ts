import { describe, expect, it } from "vitest"
import { renderHook } from "@testing-library/react"
import { useAuth } from "@/hooks/useAuth"

describe("useAuth", () => {
    it("devolve isAuthenticated como falso", () => {
        const { result } = renderHook(() => useAuth())

        expect(result.current.isAuthenticated).toBe(false)
    })
})
