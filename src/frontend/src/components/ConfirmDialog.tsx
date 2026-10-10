import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from "react"
import css from "@/styles/components/confirmDialog.module.css"

const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

type ConfirmDialogProps = {
    open: boolean
    title: string
    description?: string
    children?: ReactNode
    confirmLabel: string
    cancelLabel?: string
    tone?: "primary" | "danger"
    confirmDisabled?: boolean
    busy?: boolean
    onConfirm: () => void
    onCancel: () => void
}

function ConfirmDialog({
    open,
    title,
    description,
    children,
    confirmLabel,
    cancelLabel = "Voltar",
    tone = "primary",
    confirmDisabled = false,
    busy = false,
    onConfirm,
    onCancel
}: ConfirmDialogProps) {
    const titleId = useId()
    const descriptionId = useId()
    const cancelRef = useRef<HTMLButtonElement>(null)
    const dialogRef = useRef<HTMLDialogElement>(null)

    useEffect(() => {
        if (!open) {
            return
        }

        const previous =
            document.activeElement instanceof HTMLElement ? document.activeElement : null
        cancelRef.current?.focus()

        return () => {
            previous?.focus()
        }
    }, [open])

    useEffect(() => {
        if (!open) {
            return
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                onCancel()
                return
            }

            if (event.key === "Tab") {
                trapFocus(event)
            }
        }

        function trapFocus(event: KeyboardEvent) {
            const focusable = Array.from(
                dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []
            )

            if (focusable.length === 0) {
                event.preventDefault()
                return
            }

            const first = focusable[0]
            const last = focusable[focusable.length - 1]
            const active = document.activeElement
            const inside = active instanceof Node && dialogRef.current?.contains(active)

            if (event.shiftKey && (active === first || !inside)) {
                event.preventDefault()
                last.focus()
            } else if (!event.shiftKey && (active === last || !inside)) {
                event.preventDefault()
                first.focus()
            }
        }

        document.addEventListener("keydown", handleKeyDown)

        return () => {
            document.removeEventListener("keydown", handleKeyDown)
        }
    }, [open, onCancel])

    if (!open) {
        return null
    }

    function handleOverlayClick(event: MouseEvent<HTMLDivElement>) {
        if (event.target === event.currentTarget) {
            onCancel()
        }
    }

    const confirmClass = tone === "danger" ? `${css.confirm} ${css.danger}` : css.confirm

    return (
        <div className={css.overlay} role="presentation" onClick={handleOverlayClick}>
            <dialog
                ref={dialogRef}
                open
                className={css.dialog}
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={description ? descriptionId : undefined}
            >
                <div>
                    <h2 id={titleId} className={css.title}>
                        {title}
                    </h2>
                    {description ? (
                        <p id={descriptionId} className={css.description}>
                            {description}
                        </p>
                    ) : null}
                </div>
                {children}
                <div className={css.actions}>
                    <button ref={cancelRef} type="button" className={css.cancel} onClick={onCancel}>
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        className={confirmClass}
                        disabled={confirmDisabled || busy}
                        aria-busy={busy || undefined}
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </dialog>
        </div>
    )
}

export default ConfirmDialog
