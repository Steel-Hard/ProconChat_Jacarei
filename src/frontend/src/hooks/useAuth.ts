import { useSyncExternalStore } from "react"
import getToken from "@/services/session/getToken"
import subscribeToToken from "@/services/session/subscribeToToken"
import type AuthState from "@/types/auth/AuthState.types"

function useAuth(): AuthState {
    const token = useSyncExternalStore(subscribeToToken, getToken)

    return { isAuthenticated: token !== null }
}

export default useAuth
