import { useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"
import DocumentItem from "@/components/DocumentItem"
import type DocumentGroupProps from "@/types/documents/DocumentGroupProps.types"
import isDocumentTaken from "@/utils/documents/isDocumentTaken"
import MAX_DOCUMENT_LENGTH from "@/utils/documents/maxDocumentLength"
import MAX_DOCUMENTS_PER_GROUP from "@/utils/documents/maxDocumentsPerGroup"
import css from "@/styles/components/documentGroup.module.css"

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
        if (trimmed && !limitReached && !duplicate) {
            onAddItem(trimmed)
            setNewText("")
        }
    }

    const texts = items.map((item) => item.text)
    const isEmpty = items.length === 0
    const limitReached = items.length >= MAX_DOCUMENTS_PER_GROUP
    const duplicate = newText.trim() !== "" && isDocumentTaken(texts, newText)

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
                        key={item.id}
                        description={item.text}
                        isTaken={(text) => isDocumentTaken(texts, text, index)}
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
                    maxLength={MAX_DOCUMENT_LENGTH}
                    disabled={limitReached}
                />
                <button
                    type="submit"
                    className={css.addButton}
                    disabled={!newText.trim() || limitReached || duplicate}
                >
                    {t("items.addButton")}
                </button>
            </form>
            {limitReached ? (
                <p className={css.warning}>
                    {t("items.limitReached", { max: MAX_DOCUMENTS_PER_GROUP })}
                </p>
            ) : null}
            {duplicate ? <p className={css.warning}>{t("items.duplicate")}</p> : null}
        </section>
    )
}
