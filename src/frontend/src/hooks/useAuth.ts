import { useSyncExternalStore } from "react"
import getToken from "@/services/session/getToken"
import subscribeToToken from "@/services/session/subscribeToToken"

export type AuthState = {
    isAuthenticated: boolean
}

export function useAuth(): AuthState {
    const token = useSyncExternalStore(subscribeToToken, getToken)

    return { isAuthenticated: token !== null }
}
