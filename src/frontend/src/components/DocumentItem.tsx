import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from "react"
import { useTranslation } from "react-i18next"
import css from "@/styles/components/documentItem.module.css"

export type DocumentItemProps = {
    description: string
    index: number
    isFirst: boolean
    isLast: boolean
    onEdit: (newText: string) => void
    onRemove: () => void
    onMoveUp: () => void
    onMoveDown: () => void
}

export default function DocumentItem({
    description,
    isFirst,
    isLast,
    onEdit,
    onRemove,
    onMoveUp,
    onMoveDown
}: DocumentItemProps) {
    const { t } = useTranslation("documents")
    const [isEditing, setIsEditing] = useState(false)
    const [editText, setEditText] = useState(description)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus()
            inputRef.current?.select()
        }
    }, [isEditing])

    function handleStartEdit() {
        setEditText(description)
        setIsEditing(true)
    }

    function handleCancel() {
        setEditText(description)
        setIsEditing(false)
    }

    function handleSave(event?: FormEvent) {
        if (event) {
            event.preventDefault()
        }
        const trimmed = editText.trim()
        if (trimmed && trimmed !== description) {
            onEdit(trimmed)
        }
        setIsEditing(false)
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === "Enter") {
            handleSave()
        } else if (event.key === "Escape") {
            handleCancel()
        }
    }

    if (isEditing) {
        return (
            <li className={css.item}>
                <form className={css.editForm} onSubmit={handleSave}>
                    <input
                        ref={inputRef}
                        type="text"
                        className={css.editInput}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        aria-label={t("items.editItemAria", { item: description })}
                    />
                    <button type="submit" className={css.saveButton}>
                        {t("items.saveEditButton")}
                    </button>
                    <button type="button" className={css.cancelButton} onClick={handleCancel}>
                        {t("items.cancelEditButton")}
                    </button>
                </form>
            </li>
        )
    }

    return (
        <li className={css.item}>
            <div className={css.textWrapper}>
                <button type="button" className={css.textButton} onClick={handleStartEdit}>
                    {description}
                </button>
            </div>
            <div className={css.actions}>
                <button
                    type="button"
                    className={css.actionButton}
                    onClick={onMoveUp}
                    disabled={isFirst}
                    aria-label={t("items.moveUpAria", { item: description })}
                    title={t("items.moveUp")}
                >
                    {t("items.moveUpIcon")}
                </button>
                <button
                    type="button"
                    className={css.actionButton}
                    onClick={onMoveDown}
                    disabled={isLast}
                    aria-label={t("items.moveDownAria", { item: description })}
                    title={t("items.moveDown")}
                >
                    {t("items.moveDownIcon")}
                </button>
                <button
                    type="button"
                    className={css.actionButton}
                    onClick={handleStartEdit}
                    aria-label={t("items.editItemAria", { item: description })}
                    title={t("items.editButton")}
                >
                    {t("items.editButton")}
                </button>
                <button
                    type="button"
                    className={`${css.actionButton} ${css.removeButton}`}
                    onClick={onRemove}
                    aria-label={t("items.removeItemAria", { item: description })}
                    title={t("items.removeButton")}
                >
                    {t("items.removeButton")}
                </button>
            </div>
        </li>
    )
}
