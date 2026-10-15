import { createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"
import type AccountStatus from "@/types/account/AccountStatus.types"
import type PanelAccount from "@/types/account/PanelAccount.types"

type AccountState = {
    current: PanelAccount | null
    status: AccountStatus
}

const initialState: AccountState = { current: null, status: "unknown" }

const accountSlice = createSlice({
    name: "account",
    initialState,
    reducers: {
        accountLoaded: (state, action: PayloadAction<PanelAccount>) => {
            state.current = action.payload
            state.status = "authenticated"
        },
        accountCleared: (state) => {
            state.current = null
            state.status = "anonymous"
        }
    }
})

export default accountSlice
