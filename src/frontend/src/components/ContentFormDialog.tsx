import { useEffect, useId, useRef, type FormEvent, type MouseEvent, type ReactNode } from "react"
import css from "@/styles/components/contentForms.module.css"

const FIELD_SELECTOR = "input:not([disabled]), select:not([disabled]), textarea:not([disabled])"

const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

type ContentFormDialogProps = {
    title: string
    intro?: string
    wide?: boolean
    confirmLabel: string
    cancelLabel: string
    previewLabel?: string
    summary?: string | null
    children: ReactNode
    onConfirm: () => void
    onCancel: () => void
    onPreview?: () => void
}

function ContentFormDialog({
    title,
    intro,
    wide = false,
    confirmLabel,
    cancelLabel,
    previewLabel,
    summary = null,
    children,
    onConfirm,
    onCancel,
    onPreview
}: ContentFormDialogProps) {
    const titleId = useId()
    const dialogRef = useRef<HTMLDialogElement>(null)

    useEffect(() => {
        const previous =
            document.activeElement instanceof HTMLElement ? document.activeElement : null
        dialogRef.current?.querySelector<HTMLElement>(FIELD_SELECTOR)?.focus()

        return () => {
            previous?.focus()
        }
    }, [])

    useEffect(() => {
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

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                onCancel()
                return
            }

            if (event.key === "Tab") {
                trapFocus(event)
            }
        }

        document.addEventListener("keydown", handleKeyDown)

        return () => {
            document.removeEventListener("keydown", handleKeyDown)
        }
    }, [onCancel])

    function handleOverlayClick(event: MouseEvent<HTMLDivElement>) {
        if (event.target === event.currentTarget) {
            onCancel()
        }
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        onConfirm()
    }

    return (
        <div className={css.overlay} role="presentation" onClick={handleOverlayClick}>
            <dialog
                ref={dialogRef}
                open
                className={wide ? `${css.dialog} ${css.dialogWide}` : css.dialog}
                aria-modal="true"
                aria-labelledby={titleId}
            >
                <h2 id={titleId} className={css.title}>
                    {title}
                </h2>
                {intro ? <p className={css.intro}>{intro}</p> : null}
                <form noValidate className={css.form} onSubmit={handleSubmit}>
                    {summary ? (
                        <p role="alert" className={css.summary}>
                            {summary}
                        </p>
                    ) : null}
                    {children}
                    <div className={css.actions}>
                        {onPreview && previewLabel ? (
                            <button type="button" className={css.previewAction} onClick={onPreview}>
                                {previewLabel}
                            </button>
                        ) : null}
                        <button type="button" className={css.cancel} onClick={onCancel}>
                            {cancelLabel}
                        </button>
                        <button type="submit" className={css.confirm}>
                            {confirmLabel}
                        </button>
                    </div>
                </form>
            </dialog>
        </div>
    )
}

export default ContentFormDialog
