import type { ReactNode } from "react"
import { Provider } from "react-redux"
import { renderHook } from "@testing-library/react"
import { vi } from "vitest"
import NAV_ITEMS_ALL_READY from "@/testUtils/navItemsAllReady"
import scheduleApiStub from "@/testUtils/scheduleApiStub"
import type PanelAccount from "@/types/account/PanelAccount.types"
import type NavKey from "@/types/navigation/NavKey.types"

type Options = Parameters<typeof scheduleApiStub>[0] & {
    account?: PanelAccount
    ready?: Record<NavKey, boolean>
}

const ADMIN: PanelAccount = {
    id: 1,
    name: "Ana Paula Souza",
    email: "ana@exemplo.gov.br",
    isAdmin: true,
    permissions: []
}

async function renderScheduleHook({
    account = ADMIN,
    ready = NAV_ITEMS_ALL_READY,
    ...stub
}: Options = {}) {
    vi.stubEnv("VITE_API_URL", "http://api.test")
    vi.doMock("@/navigation/navItemsReady", () => ({ default: ready }))
    vi.resetModules()
    const { default: createStore } = await import("@/store/createStore")
    const { default: ToastProvider } = await import("@/components/ToastProvider")
    const { default: useSchedule } = await import("@/pages/hooks/useSchedule")
    const api = scheduleApiStub(stub)
    const store = createStore({ account: { current: account, status: "authenticated" } })

    function Wrapper({ children }: { children: ReactNode }) {
        return (
            <Provider store={store}>
                <ToastProvider>{children}</ToastProvider>
            </Provider>
        )
    }

    const rendered = renderHook(() => useSchedule(), { wrapper: Wrapper })

    return { ...rendered, ...api, store }
}

export default renderScheduleHook
