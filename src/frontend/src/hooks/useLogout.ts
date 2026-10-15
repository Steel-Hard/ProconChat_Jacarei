import { useCallback } from "react"
import accountSlice from "@/store/slices/account.slice"
import useAppDispatch from "@/store/useAppDispatch"

function useLogout(): () => void {
    const dispatch = useAppDispatch()

    return useCallback(() => {
        dispatch(accountSlice.actions.accountCleared())
    }, [dispatch])
}

export default useLogout
