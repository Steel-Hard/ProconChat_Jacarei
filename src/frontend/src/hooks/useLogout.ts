import { useCallback, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import useToast from "@/hooks/useToast"
import ROUTES from "@/routers/paths"
import signOut from "@/services/auth/signOut"
import api from "@/store/api"
import accountSlice from "@/store/slices/account.slice"
import useAppDispatch from "@/store/useAppDispatch"

function useLogout(): () => Promise<void> {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const { showToast } = useToast()
    const inFlight = useRef(false)

    return useCallback(async () => {
        if (inFlight.current) {
            return
        }

        inFlight.current = true

        try {
            await signOut()
        } catch {
            inFlight.current = false
            showToast(t("accountMenu.logoutFailed"))
            return
        }

        dispatch(accountSlice.actions.accountCleared())
        dispatch(api.util.resetApiState())
        await navigate(ROUTES.login, { replace: true, flushSync: true })
        inFlight.current = false
    }, [dispatch, navigate, showToast, t])
}

export default useLogout
