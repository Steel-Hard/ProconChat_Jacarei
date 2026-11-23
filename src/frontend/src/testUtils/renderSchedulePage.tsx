import { Provider } from "react-redux"
import { render } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
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

async function renderSchedulePage({
    account = ADMIN,
    ready = NAV_ITEMS_ALL_READY,
    ...stub
}: Options = {}) {
    vi.stubEnv("VITE_API_URL", "http://api.test")
    vi.doMock("@/navigation/navItemsReady", () => ({ default: ready }))
    vi.resetModules()
    const { default: createStore } = await import("@/store/createStore")
    const { default: ToastProvider } = await import("@/components/ToastProvider")
    const { default: SchedulePage } = await import("@/pages/Schedule.page")
    const api = scheduleApiStub(stub)
    const store = createStore({ account: { current: account, status: "authenticated" } })
    const user = userEvent.setup()

    render(
        <Provider store={store}>
            <MemoryRouter>
                <ToastProvider>
                    <SchedulePage />
                </ToastProvider>
            </MemoryRouter>
        </Provider>
    )

    return { ...api, store, user }
}

export default renderSchedulePage
