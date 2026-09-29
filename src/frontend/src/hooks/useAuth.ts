import { useSyncExternalStore } from "react"
import { getToken, subscribe } from "@/services/session.service"

export type AuthState = {
    isAuthenticated: boolean
}

export function useAuth(): AuthState {
    const token = useSyncExternalStore(subscribe, getToken)

    return { isAuthenticated: token !== null }
}
