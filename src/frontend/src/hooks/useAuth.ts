export type AuthState = {
    isAuthenticated: boolean
}

export function useAuth(): AuthState {
    return { isAuthenticated: false }
}
