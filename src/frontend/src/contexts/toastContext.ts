import { createContext } from "react"
import type ToastContextValue from "@/types/toast/ToastContextValue.types"

const ToastContext = createContext<ToastContextValue | null>(null)

export default ToastContext
