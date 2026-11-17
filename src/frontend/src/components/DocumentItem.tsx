import { useId, useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from "react"
import { useTranslation } from "react-i18next"
import type DocumentItemProps from "@/types/documents/DocumentItemProps.types"
import MAX_DOCUMENT_LENGTH from "@/utils/documents/maxDocumentLength"
import css from "@/styles/components/documentItem.module.css"

export default function DocumentItem({
    description,
    position,
    isTaken,
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
    const warningId = useId()

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
        if (trimmed && isTaken(trimmed)) {
            return
        }
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

    const editTaken = isEditing && editText.trim() !== "" && isTaken(editText)

    if (isEditing) {
        return (
            <li className={css.item}>
                <span className={css.position} aria-hidden="true">
                    {position}
                </span>
                <form className={css.editForm} onSubmit={handleSave}>
                    <div className={css.editField}>
                        <input
                            ref={inputRef}
                            type="text"
                            className={css.editInput}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            aria-label={t("items.editItemAria", { item: description })}
                            maxLength={MAX_DOCUMENT_LENGTH}
                            aria-describedby={editTaken ? warningId : undefined}
                        />
                        <span className={css.editHint}>{t("items.editHint")}</span>
                        {editTaken ? (
                            <p id={warningId} role="status" className={css.warning}>
                                {t("items.duplicate")}
                            </p>
                        ) : null}
                    </div>
                    <div className={css.actions}>
                        <button type="submit" className={css.saveButton} disabled={editTaken}>
                            {t("items.saveEditButton")}
                        </button>
                        <button type="button" className={css.cancelButton} onClick={handleCancel}>
                            {t("items.cancelEditButton")}
                        </button>
                    </div>
                </form>
            </li>
        )
    }

    return (
        <li className={css.item}>
            <span className={css.position} aria-hidden="true">
                {position}
            </span>
            <button type="button" className={css.textButton} onClick={handleStartEdit}>
                {description}
            </button>
            <div className={css.actions}>
                <button
                    type="button"
                    className={`${css.actionButton} ${css.editButton}`}
                    onClick={handleStartEdit}
                    aria-label={t("items.editItemAria", { item: description })}
                    title={t("items.editButton")}
                >
                    {t("items.editButton")}
                </button>
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
                    className={`${css.actionButton} ${css.removeButton}`}
                    onClick={onRemove}
                    aria-label={t("items.removeItemAria", { item: description })}
                    title={t("items.removeButton")}
                >
                    {t("items.removeIcon")}
                </button>
            </div>
        </li>
    )
}
