import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"
import { Provider } from "react-redux"
import { MemoryRouter } from "react-router-dom"
import { act, renderHook } from "@testing-library/react"
import ToastProvider from "@/components/ToastProvider"
import usePanelShell from "@/hooks/usePanelShell"
import createStore from "@/store/createStore"
import mockMatchMedia from "@/testUtils/mockMatchMedia"
import type PanelAccount from "@/types/account/PanelAccount.types"

const account: PanelAccount = {
    id: 1,
    name: "Ana",
    email: "ana@exemplo.gov.br",
    isAdmin: true,
    permissions: []
}

function renderShell(width: number) {
    mockMatchMedia(width)
    const store = createStore({ account: { current: account, status: "authenticated" } })

    function Wrapper({ children }: { children: ReactNode }) {
        return (
            <Provider store={store}>
                <MemoryRouter>
                    <ToastProvider>{children}</ToastProvider>
                </MemoryRouter>
            </Provider>
        )
    }

    return renderHook(() => usePanelShell(), { wrapper: Wrapper })
}

describe("usePanelShell", () => {
    it("devolve a conta da sessão", () => {
        const { result } = renderShell(1440)

        expect(result.current.account).toEqual(account)
    })

    it("mantém o menu encaixado em tela larga", () => {
        const { result } = renderShell(1440)

        expect(result.current.docked).toBe(true)
        expect(result.current.sidebarMode).toBe("docked")
        expect(result.current.drawerVisible).toBe(false)
    })

    it("abre e fecha a gaveta em tela estreita", () => {
        const { result } = renderShell(900)

        expect(result.current.sidebarMode).toBe("drawer")

        act(() => result.current.openDrawer())

        expect(result.current.sidebarMode).toBe("drawerOpen")
        expect(result.current.drawerVisible).toBe(true)

        act(() => result.current.closeDrawer())

        expect(result.current.sidebarMode).toBe("drawer")
        expect(result.current.drawerVisible).toBe(false)
    })

    it("fecha a gaveta com Esc", () => {
        const { result } = renderShell(900)

        act(() => result.current.openDrawer())
        act(() => {
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
        })

        expect(result.current.drawerVisible).toBe(false)
    })

    it("abre e fecha o modal de senha", () => {
        const { result } = renderShell(1440)

        expect(result.current.passwordOpen).toBe(false)

        act(() => result.current.openPassword())

        expect(result.current.passwordOpen).toBe(true)

        act(() => result.current.closePassword())

        expect(result.current.passwordOpen).toBe(false)
    })
})
