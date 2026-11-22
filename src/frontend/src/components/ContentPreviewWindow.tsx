import { useEffect, useRef, useState, type MouseEvent } from "react"
import ContentPreview from "@/components/ContentPreview"
import type ContentPreviewProps from "@/types/content/ContentPreviewProps.types"
import css from "@/styles/components/contentPreview.module.css"

const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function ContentPreviewWindow(props: ContentPreviewProps) {
    const { onClose } = props
    const overlayRef = useRef<HTMLDivElement>(null)
    const [previous] = useState(() =>
        document.activeElement instanceof HTMLElement ? document.activeElement : null
    )

    useEffect(() => {
        function trapFocus(event: KeyboardEvent) {
            const focusable = Array.from(
                overlayRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []
            )

            if (focusable.length === 0) {
                event.preventDefault()
                return
            }

            const first = focusable[0]
            const last = focusable[focusable.length - 1]
            const active = document.activeElement
            const inside = active instanceof Node && overlayRef.current?.contains(active)

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
                event.stopImmediatePropagation()
                onClose()
                return
            }

            if (event.key === "Tab") {
                trapFocus(event)
            }
        }

        document.addEventListener("keydown", handleKeyDown, true)

        return () => {
            document.removeEventListener("keydown", handleKeyDown, true)
        }
    }, [onClose])

    useEffect(
        () => () => {
            previous?.focus()
        },
        [previous]
    )

    function handleOverlayClick(event: MouseEvent<HTMLDivElement>) {
        if (event.target === event.currentTarget) {
            onClose()
        }
    }

    return (
        <div
            ref={overlayRef}
            className={css.modalOverlay}
            role="presentation"
            onClick={handleOverlayClick}
        >
            <ContentPreview {...props} />
        </div>
    )
}

export default ContentPreviewWindow
