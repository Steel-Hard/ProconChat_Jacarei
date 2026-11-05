import { Provider } from "react-redux"
import { render } from "@testing-library/react"
import ToastProvider from "@/components/ToastProvider"
import DocumentsPage from "@/pages/Documents.page"
import createStore from "@/store/createStore"
import type RootState from "@/types/store/RootState.types"

export function renderDocumentsPage(options: { preloadedState?: Partial<RootState> } = {}) {
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

export default renderDocumentsPage
