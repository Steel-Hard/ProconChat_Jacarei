import { Provider } from "react-redux"
import { render } from "@testing-library/react"
import { vi } from "vitest"
import type RootState from "@/types/store/RootState.types"

export default async function renderDocumentsPage(
    fetchMock: typeof fetch,
    options: { preloadedState?: Partial<RootState> } = {}
) {
    vi.stubEnv("VITE_API_URL", "http://api.test")
    vi.resetModules()
    vi.stubGlobal("fetch", fetchMock)
    const { default: createStore } = await import("@/store/createStore")
    const { default: ToastProvider } = await import("@/components/ToastProvider")
    const { default: DocumentsPage } = await import("@/pages/Documents.page")
    const store = createStore(options.preloadedState)
    const result = render(
        <Provider store={store}>
            <ToastProvider>
                <DocumentsPage />
            </ToastProvider>
        </Provider>
    )
    return { ...result, store }
}
