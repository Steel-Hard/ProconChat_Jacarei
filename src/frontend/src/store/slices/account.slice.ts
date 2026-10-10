import { createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"
import type { PanelAccount } from "@/types/account"

type AccountState = {
    current: PanelAccount | null
}

const initialState: AccountState = { current: null }

const accountSlice = createSlice({
    name: "account",
    initialState,
    reducers: {
        accountLoaded: (state, action: PayloadAction<PanelAccount>) => {
            state.current = action.payload
        },
        accountCleared: (state) => {
            state.current = null
        }
    }
})

export default accountSlice
