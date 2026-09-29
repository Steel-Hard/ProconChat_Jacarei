import { afterEach, describe, expect, it } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { useAuth } from "@/hooks/useAuth"
import { clearToken, setToken } from "@/services/session.service"

describe("useAuth", () => {
    afterEach(() => {
        clearToken()
    })

    it("indica não autenticado quando não há token", () => {
        const { result } = renderHook(() => useAuth())

        expect(result.current.isAuthenticated).toBe(false)
    })

    it("acompanha a chegada e a remoção do token", () => {
        const { result } = renderHook(() => useAuth())

        act(() => setToken("abc"))
        expect(result.current.isAuthenticated).toBe(true)

        act(() => clearToken())
        expect(result.current.isAuthenticated).toBe(false)
    })
})
