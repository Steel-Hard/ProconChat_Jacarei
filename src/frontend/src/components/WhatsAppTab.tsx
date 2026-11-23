import type { KeyboardEvent, Ref } from "react"
import css from "@/styles/components/whatsAppTabs.module.css"

type WhatsAppTabProps = {
    id: string
    label: string
    selected: boolean
    panelId: string
    ref: Ref<HTMLButtonElement>
    onSelect: () => void
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void
}

function WhatsAppTab({ id, label, selected, panelId, ref, onSelect, onKeyDown }: WhatsAppTabProps) {
    return (
        <button
            ref={ref}
            id={id}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            className={css.tab}
            onClick={onSelect}
            onKeyDown={onKeyDown}
        >
            {label}
        </button>
    )
}

export default WhatsAppTab
