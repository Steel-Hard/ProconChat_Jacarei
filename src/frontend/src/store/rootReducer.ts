import { combineReducers } from "@reduxjs/toolkit"
import api from "@/store/api"
import accountSlice from "@/store/slices/account.slice"

const rootReducer = combineReducers({
    [api.reducerPath]: api.reducer,
    [accountSlice.name]: accountSlice.reducer
})

export default rootReducer
