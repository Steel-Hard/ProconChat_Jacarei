import { Provider } from "react-redux"
import { render } from "@testing-library/react"
import { vi } from "vitest"
import type RootState from "@/types/store/RootState.types"

export default async function renderDocumentsPage(
    options: { preloadedState?: Partial<RootState> } = {}
) {
    vi.stubEnv("VITE_API_URL", "http://api.test")
    vi.resetModules()
    const [{ default: ToastProvider }, { default: DocumentsPage }, { default: createStore }] =
        await Promise.all([
            import("@/components/ToastProvider"),
            import("@/pages/Documents.page"),
            import("@/store/createStore")
        ])
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
