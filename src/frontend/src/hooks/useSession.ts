import { useEffect } from "react"
import fetchCurrentAccount from "@/services/auth/fetchCurrentAccount"
import onUnauthorized from "@/services/http/onUnauthorized"
import accountSlice from "@/store/slices/account.slice"
import useAppDispatch from "@/store/useAppDispatch"
import useAppSelector from "@/store/useAppSelector"
import type AccountStatus from "@/types/account/AccountStatus.types"

function useSession(): AccountStatus {
    const dispatch = useAppDispatch()
    const status = useAppSelector((state) => state.account.status)

    useEffect(() => {
        onUnauthorized(() => dispatch(accountSlice.actions.accountCleared()))

        return () => {
            onUnauthorized(null)
        }
    }, [dispatch])

    useEffect(() => {
        if (status !== "unknown") {
            return
        }

        const controller = new AbortController()

        fetchCurrentAccount(controller.signal).then(
            (account) => {
                if (!controller.signal.aborted) {
                    dispatch(accountSlice.actions.accountLoaded(account))
                }
            },
            () => {
                if (!controller.signal.aborted) {
                    dispatch(accountSlice.actions.accountCleared())
                }
            }
        )

        return () => {
            controller.abort()
        }
    }, [status, dispatch])

    return status
}

export default useSession
