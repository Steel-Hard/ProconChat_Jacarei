import {
    useId,
    useRef,
    useState,
    type KeyboardEvent,
    type MouseEvent,
    type PointerEvent
} from "react"
import css from "@/styles/components/unsavedChangesBar.module.css"

type UnsavedChangesBarProps = {
    changes: string[]
    onDiscard: () => void
    onSave: () => void
    saving?: boolean
    saveLabel?: string
}

function UnsavedChangesBar({
    changes,
    onDiscard,
    onSave,
    saving = false,
    saveLabel = "Salvar alterações"
}: UnsavedChangesBarProps) {
    const listId = useId()
    const [listOpen, setListOpen] = useState(false)
    const press = useRef<{ pointerType: string; wasOpen: boolean } | null>(null)
    const count = changes.length
    const hasChanges = count > 0
    const summary = count === 1 ? "1 alteração não salva" : `${count} alterações não salvas`

    function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
        press.current = { pointerType: event.pointerType, wasOpen: listOpen }
    }

    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        const current = press.current
        press.current = null

        if (event.detail === 0 || current === null) {
            setListOpen(!listOpen)
            return
        }

        if (current.pointerType === "touch") {
            setListOpen(!current.wasOpen)
            return
        }

        setListOpen(true)
    }

    function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
        if (event.key === "Escape") {
            setListOpen(false)
        }
    }

    return (
        <div className={css.bar}>
            {hasChanges ? (
                <>
                    <span className={css.wrapper}>
                        <button
                            type="button"
                            className={css.chip}
                            aria-describedby={listOpen ? listId : undefined}
                            onMouseEnter={() => setListOpen(true)}
                            onMouseLeave={() => setListOpen(false)}
                            onFocus={() => setListOpen(true)}
                            onBlur={() => setListOpen(false)}
                            onPointerDown={handlePointerDown}
                            onClick={handleClick}
                            onKeyDown={handleKeyDown}
                        >
                            {summary}
                        </button>
                        {listOpen ? (
                            <span id={listId} role="tooltip" className={css.bubble}>
                                {`Pendentes: ${changes.join("; ")}`}
                            </span>
                        ) : null}
                    </span>
                    <button
                        type="button"
                        className={css.discard}
                        disabled={saving}
                        onClick={onDiscard}
                    >
                        Descartar
                    </button>
                </>
            ) : null}
            <button
                type="button"
                className={css.save}
                disabled={!hasChanges || saving}
                aria-busy={saving || undefined}
                onClick={onSave}
            >
                {saveLabel}
            </button>
        </div>
    )
}

export default UnsavedChangesBar
