import {
    useCallback,
    useEffect,
    useId,
    useRef,
    useState,
    type FormEvent,
    type ReactNode
} from "react"
import { useTranslation } from "react-i18next"
import ConfirmDialog from "@/components/ConfirmDialog"
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
    dirty?: boolean
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
    dirty = false,
    children,
    onConfirm,
    onCancel,
    onPreview
}: ContentFormDialogProps) {
    const { t } = useTranslation("content")
    const titleId = useId()
    const overlayRef = useRef<HTMLDivElement>(null)
    const dialogRef = useRef<HTMLDialogElement>(null)
    const summaryRef = useRef<HTMLParagraphElement>(null)
    const [confirmingDiscard, setConfirmingDiscard] = useState(false)
    const [submitAttempt, setSubmitAttempt] = useState(0)
    const closeDiscardDialog = useCallback(() => setConfirmingDiscard(false), [])

    useEffect(() => {
        const overlay = overlayRef.current
        const inerted: Element[] = []
        let node: Element | null = overlay

        while (node && node !== document.body) {
            const current: Element = node
            Array.from(current.parentElement?.children ?? []).forEach((sibling) => {
                if (sibling !== current && !sibling.hasAttribute("inert")) {
                    sibling.setAttribute("inert", "")
                    inerted.push(sibling)
                }
            })
            node = current.parentElement
        }

        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = "hidden"

        return () => {
            inerted.forEach((element) => element.removeAttribute("inert"))
            document.body.style.overflow = previousOverflow
        }
    }, [])

    useEffect(() => {
        if (submitAttempt === 0) {
            return
        }

        const invalid = dialogRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')
        const target = invalid ?? summaryRef.current

        target?.focus()
        target?.scrollIntoView?.({ block: "center" })
    }, [submitAttempt])

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
            if (confirmingDiscard) {
                return
            }

            if (event.key === "Escape") {
                if (dirty) {
                    setConfirmingDiscard(true)
                } else {
                    onCancel()
                }
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
    }, [onCancel, dirty, confirmingDiscard])

    function requestClose() {
        if (dirty) {
            setConfirmingDiscard(true)
        } else {
            onCancel()
        }
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        onConfirm()
        setSubmitAttempt((current) => current + 1)
    }

    return (
        <div ref={overlayRef} className={css.overlay} role="presentation">
            <dialog
                ref={dialogRef}
                open
                className={wide ? `${css.dialog} ${css.dialogWide}` : css.dialog}
                aria-modal="true"
                aria-labelledby={titleId}
                inert={confirmingDiscard || undefined}
            >
                <h2 id={titleId} className={css.title}>
                    {title}
                </h2>
                {intro ? <p className={css.intro}>{intro}</p> : null}
                <form noValidate className={css.form} onSubmit={handleSubmit}>
                    {summary ? (
                        <p ref={summaryRef} tabIndex={-1} role="alert" className={css.summary}>
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
                        <button type="button" className={css.cancel} onClick={requestClose}>
                            {cancelLabel}
                        </button>
                        <button type="submit" className={css.confirm}>
                            {confirmLabel}
                        </button>
                    </div>
                </form>
            </dialog>
            <ConfirmDialog
                open={confirmingDiscard}
                tone="danger"
                narrow
                title={t("discardDialog.title")}
                description={t("discardDialog.description")}
                confirmLabel={t("discardDialog.confirm")}
                cancelLabel={t("discardDialog.cancel")}
                onConfirm={onCancel}
                onCancel={closeDiscardDialog}
            />
        </div>
    )
}

export default ContentFormDialog
