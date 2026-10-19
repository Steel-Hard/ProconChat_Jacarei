import { combineReducers } from "@reduxjs/toolkit"
import api from "@/store/api"
import accountSlice from "@/store/slices/account.slice"
import appointmentSearchSlice from "@/store/slices/appointmentSearch.slice"

const rootReducer = combineReducers({
    [api.reducerPath]: api.reducer,
    [accountSlice.name]: accountSlice.reducer,
    [appointmentSearchSlice.name]: appointmentSearchSlice.reducer
})

export default rootReducer
