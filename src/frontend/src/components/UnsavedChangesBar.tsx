import { useId, useState, type KeyboardEvent } from "react"
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
    const count = changes.length
    const hasChanges = count > 0
    const summary = count === 1 ? "1 alteração não salva" : `${count} alterações não salvas`

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
