import { createContext, useContext } from "react"

export type ToastContextValue = {
    showToast: (message: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
    const context = useContext(ToastContext)

    if (context === null) {
        throw new Error("useToast precisa estar dentro de ToastProvider")
    }

    return context
}
