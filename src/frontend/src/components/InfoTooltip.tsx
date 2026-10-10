import { useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react"
import css from "@/styles/components/infoTooltip.module.css"

type InfoTooltipProps = {
    text: string
    label?: string
}

function InfoTooltip({ text, label = "Mais informações" }: InfoTooltipProps) {
    const tooltipId = useId()
    const [open, setOpen] = useState(false)
    const openBeforePress = useRef<boolean | null>(null)

    function handlePointerEnter(event: PointerEvent<HTMLButtonElement>) {
        if (event.pointerType !== "touch") {
            setOpen(true)
        }
    }

    function handlePointerLeave(event: PointerEvent<HTMLButtonElement>) {
        if (event.pointerType !== "touch") {
            setOpen(false)
        }
    }

    function handlePointerDown() {
        openBeforePress.current = open
    }

    function handleClick() {
        const wasOpen = openBeforePress.current ?? open
        openBeforePress.current = null
        setOpen(!wasOpen)
    }

    function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
        if (event.key === "Escape") {
            setOpen(false)
        }
    }

    return (
        <span className={css.wrapper}>
            <button
                type="button"
                className={css.trigger}
                aria-label={label}
                aria-describedby={open ? tooltipId : undefined}
                onPointerEnter={handlePointerEnter}
                onPointerLeave={handlePointerLeave}
                onPointerDown={handlePointerDown}
                onFocus={() => setOpen(true)}
                onBlur={() => setOpen(false)}
                onClick={handleClick}
                onKeyDown={handleKeyDown}
            >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <circle cx="8" cy="8" r="6.75" stroke="currentColor" strokeWidth="1.5" />
                    <rect x="7.25" y="7" width="1.5" height="4.5" rx=".75" fill="currentColor" />
                    <circle cx="8" cy="4.9" r=".95" fill="currentColor" />
                </svg>
            </button>
            {open ? (
                <span id={tooltipId} role="tooltip" className={css.bubble}>
                    {text}
                </span>
            ) : null}
        </span>
    )
}

export default InfoTooltip
