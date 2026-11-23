import { Provider } from "react-redux"
import { render } from "@testing-library/react"
import { vi } from "vitest"
import contentServerStub from "@/testUtils/contentServerStub"

type Options = Parameters<typeof contentServerStub>[0]

async function renderContentPage(
    options: Options,
    prepare: (server: ReturnType<typeof contentServerStub>) => void = () => {}
) {
    vi.stubEnv("VITE_API_URL", "http://api.test")
    vi.resetModules()
    const server = contentServerStub(options)
    prepare(server)
    vi.stubGlobal(
        "fetch",
        vi.fn((request: Request) => server.handle(request))
    )
    const { default: createStore } = await import("@/store/createStore")
    const { default: ToastProvider } = await import("@/components/ToastProvider")
    const { default: ContentPage } = await import("@/pages/Content.page")
    const store = createStore()
    const view = render(
        <Provider store={store}>
            <ToastProvider>
                <ContentPage />
            </ToastProvider>
        </Provider>
    )

    return { ...view, server }
}

export default renderContentPage
