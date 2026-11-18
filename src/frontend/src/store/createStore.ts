import { configureStore } from "@reduxjs/toolkit"
import api from "@/store/api"
import rootReducer from "@/store/rootReducer"
import type RootState from "@/types/store/RootState.types"

const TEST_MIDDLEWARE_WARN_AFTER_MS = 500

function createStore(preloadedState?: Partial<RootState>) {
    const warnAfter = import.meta.env.MODE === "test" ? TEST_MIDDLEWARE_WARN_AFTER_MS : undefined

    return configureStore({
        reducer: rootReducer,
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware({
                immutableCheck: { warnAfter },
                serializableCheck: { warnAfter }
            }).concat(api.middleware),
        preloadedState
    })
}

export default createStore
