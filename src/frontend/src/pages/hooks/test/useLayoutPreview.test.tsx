import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import ToastProvider from "@/components/ToastProvider"
import { useLayoutPreview } from "@/pages/hooks/useLayoutPreview"
import { clearAccount, getAccount, setAccount } from "@/services/account.service"
import type { PanelAccount } from "@/types/account"

const realAccount: PanelAccount = {
    name: "Bruno Lima",
    email: "bruno@exemplo.gov.br",
    isAdmin: false,
    permissions: ["sessions.view"]
}

function wrapper({ children }: { children: ReactNode }) {
    return <ToastProvider>{children}</ToastProvider>
}

describe("useLayoutPreview", () => {
    afterEach(() => {
        clearAccount()
        vi.useRealTimers()
    })

    it("restaura a conta anterior ao sair da prévia", () => {
        setAccount(realAccount)

        const { unmount } = renderHook(() => useLayoutPreview(), { wrapper })
        expect(getAccount()?.name).toBe("Mariana Couto")

        unmount()

        expect(getAccount()).toEqual(realAccount)
    })

    it("limpa o temporizador do salvamento ao desmontar", () => {
        vi.useFakeTimers()
        const { result, unmount } = renderHook(() => useLayoutPreview(), { wrapper })

        act(() => result.current.saveChanges())
        expect(vi.getTimerCount()).toBe(1)

        unmount()

        expect(vi.getTimerCount()).toBe(0)
    })
})
