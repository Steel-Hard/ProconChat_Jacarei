import { useContext } from "react"
import ToastContext from "@/contexts/toastContext"
import type ToastContextValue from "@/types/toast/ToastContextValue.types"

function useToast(): ToastContextValue {
    const context = useContext(ToastContext)

    if (context === null) {
        throw new Error("useToast precisa estar dentro de ToastProvider")
    }

    return context
}

export default useToast
