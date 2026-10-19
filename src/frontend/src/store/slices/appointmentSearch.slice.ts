import { createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"
import accountSlice from "@/store/slices/account.slice"

type AppointmentSearchState = {
    term: string
}

const initialState: AppointmentSearchState = { term: "" }

const appointmentSearchSlice = createSlice({
    name: "appointmentSearch",
    initialState,
    reducers: {
        searchChanged: (state, action: PayloadAction<string>) => {
            state.term = action.payload
        },
        searchCleared: (state) => {
            state.term = ""
        }
    },
    extraReducers: (builder) => {
        builder.addCase(accountSlice.actions.accountCleared, (state) => {
            state.term = ""
        })
    }
})

export default appointmentSearchSlice
