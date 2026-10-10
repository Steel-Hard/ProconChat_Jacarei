import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from "react"
import css from "@/styles/components/confirmDialog.module.css"

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
