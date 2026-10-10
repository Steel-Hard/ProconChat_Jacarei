import { useCallback } from "react"
import clearToken from "@/services/session/clearToken"
import accountSlice from "@/store/slices/account.slice"
import useAppDispatch from "@/store/useAppDispatch"

function useLogout(): () => void {
    const dispatch = useAppDispatch()

    return useCallback(() => {
        clearToken()
        dispatch(accountSlice.actions.accountCleared())
    }, [dispatch])
}

export default useLogout
