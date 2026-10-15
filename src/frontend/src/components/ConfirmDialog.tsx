import { useEffect, useId, useRef, type FormEvent, type MouseEvent, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import css from "@/styles/components/confirmDialog.module.css"

const FIELD_SELECTOR = "input:not([disabled]), select:not([disabled]), textarea:not([disabled])"

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
    submitOnEnter?: boolean
    onConfirm: () => void
    onCancel: () => void
}

function ConfirmDialog({
    open,
    title,
    description,
    children,
    confirmLabel,
    cancelLabel,
    tone = "primary",
    confirmDisabled = false,
    busy = false,
    submitOnEnter = false,
    onConfirm,
    onCancel
}: ConfirmDialogProps) {
    const { t } = useTranslation()
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
        const field = submitOnEnter
            ? dialogRef.current?.querySelector<HTMLElement>(FIELD_SELECTOR)
            : null
        const target = field ?? cancelRef.current
        target?.focus()

        return () => {
            previous?.focus()
        }
    }, [open, submitOnEnter])

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

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (!confirmDisabled && !busy) {
            onConfirm()
        }
    }

    const confirmClass = tone === "danger" ? `${css.confirm} ${css.danger}` : css.confirm

    const content = (
        <>
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
                    {cancelLabel ?? t("confirmDialog.cancel")}
                </button>
                <button
                    type={submitOnEnter ? "submit" : "button"}
                    className={confirmClass}
                    disabled={confirmDisabled || busy}
                    aria-busy={busy || undefined}
                    onClick={submitOnEnter ? undefined : onConfirm}
                >
                    {confirmLabel}
                </button>
            </div>
        </>
    )

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
                {submitOnEnter ? (
                    <form noValidate className={css.form} onSubmit={handleSubmit}>
                        {content}
                    </form>
                ) : (
                    content
                )}
            </dialog>
        </div>
    )
}

export default ConfirmDialog
