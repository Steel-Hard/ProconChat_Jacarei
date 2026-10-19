import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import ToastContext from "@/contexts/toastContext"
import css from "@/styles/components/toast.module.css"

const TOAST_DURATION_MS = 2600

type ToastProviderProps = {
    children: ReactNode
}

function ToastProvider({ children }: ToastProviderProps) {
    const [message, setMessage] = useState<string | null>(null)
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const clearTimer = useCallback(() => {
        if (timer.current !== null) {
            clearTimeout(timer.current)
            timer.current = null
        }
    }, [])

    const showToast = useCallback(
        (value: string) => {
            clearTimer()
            setMessage(value)
            timer.current = setTimeout(() => {
                timer.current = null
                setMessage(null)
            }, TOAST_DURATION_MS)
        },
        [clearTimer]
    )

    useEffect(() => clearTimer, [clearTimer])

    const value = useMemo(() => ({ showToast }), [showToast])

    return (
        <ToastContext.Provider value={value}>
            {children}
            <output aria-live="polite" className={css.region}>
                {message !== null ? <span className={css.toast}>{message}</span> : null}
            </output>
        </ToastContext.Provider>
    )
}

export default ToastProvider
