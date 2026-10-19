import { configureStore } from "@reduxjs/toolkit"
import api from "@/store/api"
import rootReducer from "@/store/rootReducer"
import type RootState from "@/types/store/RootState.types"

function createStore(preloadedState?: Partial<RootState>) {
    return configureStore({
        reducer: rootReducer,
        middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
        preloadedState
    })
}

export default createStore
