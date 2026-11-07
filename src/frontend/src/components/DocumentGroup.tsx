import { useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"
import DocumentItem from "@/components/DocumentItem"
import css from "@/styles/components/documentGroup.module.css"

export type DocumentGroupProps = {
    title: string
    description: string
    items: string[]
    emptyAlert: string
    onAddItem: (description: string) => void
    onEditItem: (index: number, newText: string) => void
    onRemoveItem: (index: number) => void
    onMoveUp: (index: number) => void
    onMoveDown: (index: number) => void
}

export default function DocumentGroup({
    title,
    description,
    items,
    emptyAlert,
    onAddItem,
    onEditItem,
    onRemoveItem,
    onMoveUp,
    onMoveDown
}: DocumentGroupProps) {
    const { t } = useTranslation("documents")
    const [newText, setNewText] = useState("")

    function handleAdd(e: FormEvent) {
        e.preventDefault()
        const trimmed = newText.trim()
        if (trimmed) {
            onAddItem(trimmed)
            setNewText("")
        }
    }

    const isEmpty = items.length === 0

    return (
        <section className={css.groupCard}>
            <div className={css.header}>
                <h2 className={css.title}>{title}</h2>
                <p className={css.description}>{description}</p>
            </div>

            {isEmpty ? (
                <div role="alert" className={css.emptyAlert}>
                    {emptyAlert}
                </div>
            ) : null}

            <ul className={css.list} aria-label={title}>
                {items.map((item, index) => (
                    <DocumentItem
                        key={`${item}-${index}`}
                        description={item}
                        index={index}
                        isFirst={index === 0}
                        isLast={index === items.length - 1}
                        onEdit={(newDesc) => onEditItem(index, newDesc)}
                        onRemove={() => onRemoveItem(index)}
                        onMoveUp={() => onMoveUp(index)}
                        onMoveDown={() => onMoveDown(index)}
                    />
                ))}
            </ul>

            <form className={css.addForm} onSubmit={handleAdd}>
                <input
                    type="text"
                    className={css.addInput}
                    placeholder={t("items.addPlaceholder")}
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    aria-label={`${t("items.addPlaceholder")} (${title})`}
                />
                <button
                    type="submit"
                    className={css.addButton}
                    disabled={!newText.trim()}
                >
                    {t("items.addButton")}
                </button>
            </form>
        </section>
    )
}
