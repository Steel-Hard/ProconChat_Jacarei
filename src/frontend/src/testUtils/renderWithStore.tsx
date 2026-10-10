import type { ReactElement } from "react"
import { Provider } from "react-redux"
import { render } from "@testing-library/react"
import createStore from "@/store/createStore"
import type RootState from "@/types/store/RootState.types"

type RenderWithStoreOptions = {
    preloadedState?: Partial<RootState>
}

function renderWithStore(ui: ReactElement, { preloadedState }: RenderWithStoreOptions = {}) {
    const store = createStore(preloadedState)
    const result = render(<Provider store={store}>{ui}</Provider>)

    return { ...result, store }
}

export default renderWithStore
