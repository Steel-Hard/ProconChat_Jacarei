import { useId, useRef, type KeyboardEvent, type ReactNode } from "react"
import WhatsAppTab from "@/components/WhatsAppTab"
import css from "@/styles/components/whatsAppTabs.module.css"

type Tab = { id: string; label: string }

type WhatsAppTabsProps = {
    label: string
    tabs: Tab[]
    selected: string
    onSelect: (id: string) => void
    children: ReactNode
}

function WhatsAppTabs({ label, tabs, selected, onSelect, children }: WhatsAppTabsProps) {
    const baseId = useId()
    const buttons = useRef<Record<string, HTMLButtonElement | null>>({})
    const tabId = (id: string) => `${baseId}-tab-${id}`
    const panelId = `${baseId}-panel`

    function move(event: KeyboardEvent<HTMLButtonElement>, index: number) {
        const offsets: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 }
        const offset = offsets[event.key]

        if (offset === undefined) {
            return
        }

        event.preventDefault()
        const next = tabs[(index + offset + tabs.length) % tabs.length]
        onSelect(next.id)
        buttons.current[next.id]?.focus()
    }

    return (
        <div className={css.tabs}>
            <div role="tablist" aria-label={label} className={css.list}>
                {tabs.map((tab, index) => (
                    <WhatsAppTab
                        key={tab.id}
                        ref={(element) => {
                            buttons.current[tab.id] = element
                        }}
                        id={tabId(tab.id)}
                        label={tab.label}
                        selected={tab.id === selected}
                        panelId={panelId}
                        onSelect={() => onSelect(tab.id)}
                        onKeyDown={(event) => move(event, index)}
                    />
                ))}
            </div>
            <div id={panelId} role="tabpanel" aria-labelledby={tabId(selected)}>
                {children}
            </div>
        </div>
    )
}

export default WhatsAppTabs
