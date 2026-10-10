import { afterEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen } from "@testing-library/react"
import ToastProvider from "@/components/ToastProvider"
import useLayoutPreview from "@/pages/hooks/useLayoutPreview"
import renderWithStore from "@/testUtils/renderWithStore"
import type PanelAccount from "@/types/account/PanelAccount.types"

const realAccount: PanelAccount = {
    name: "Bruno Lima",
    email: "bruno@exemplo.gov.br",
    isAdmin: false,
    permissions: ["sessions.view"]
}

function PreviewProbe() {
    const preview = useLayoutPreview()

    return (
        <button type="button" onClick={preview.saveChanges}>
            Salvar
        </button>
    )
}

function renderPreview(account: PanelAccount | null) {
    return renderWithStore(
        <ToastProvider>
            <PreviewProbe />
        </ToastProvider>,
        { preloadedState: { account: { current: account } } }
    )
}

describe("useLayoutPreview", () => {
    afterEach(() => {
        vi.useRealTimers()
    })

    it("restaura a conta anterior ao sair da prévia", () => {
        const { store, unmount } = renderPreview(realAccount)
        expect(store.getState().account.current?.name).toBe("Mariana Couto")

        unmount()

        expect(store.getState().account.current).toEqual(realAccount)
    })

    it("limpa a conta de exemplo ao sair quando não havia conta", () => {
        const { store, unmount } = renderPreview(null)

        unmount()

        expect(store.getState().account.current).toBeNull()
    })

    it("limpa o temporizador do salvamento ao desmontar", () => {
        vi.useFakeTimers()
        const { unmount } = renderPreview(null)

        fireEvent.click(screen.getByRole("button", { name: "Salvar" }))
        expect(vi.getTimerCount()).toBe(1)

        unmount()

        expect(vi.getTimerCount()).toBe(0)
    })
})
