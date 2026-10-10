import { afterEach, describe, expect, it } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { useAccount } from "@/hooks/useAccount"
import { clearAccount, setAccount } from "@/services/account.service"
import type { PanelAccount } from "@/types/account"

const account: PanelAccount = {
    name: "Ana Paula Souza",
    email: "ana@exemplo.gov.br",
    isAdmin: true,
    permissions: []
}

describe("useAccount", () => {
    afterEach(() => {
        clearAccount()
    })

    it("devolve a conta atual", () => {
        setAccount(account)

        const { result } = renderHook(() => useAccount())

        expect(result.current).toEqual(account)
    })

    it("atualiza quando a conta muda", () => {
        const { result } = renderHook(() => useAccount())
        expect(result.current).toBeNull()

        act(() => setAccount(account))

        expect(result.current).toEqual(account)
    })
})
