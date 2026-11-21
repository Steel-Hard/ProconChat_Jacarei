import { useId, useState } from "react"
import { useTranslation } from "react-i18next"
import type ContentDocumentsFieldProps from "@/types/content/ContentDocumentsFieldProps.types"
import contentErrorText from "@/utils/content/contentErrorText"
import CONTENT_LIMITS from "@/utils/content/contentLimits"
import duplicateDocuments from "@/utils/content/duplicateDocuments"
import css from "@/styles/components/contentForms.module.css"

function ContentDocumentsField({ documents, errors, onChange }: ContentDocumentsFieldProps) {
    const { t } = useTranslation("content")
    const listId = useId()
    const [draftText, setDraftText] = useState("")
    const [addError, setAddError] = useState<string | null>(null)
    const repeated = new Set(duplicateDocuments(documents))
    const full = documents.length >= CONTENT_LIMITS.documentsCount

    function add() {
        const text = draftText.trim()

        if (text === "") {
            setAddError(t("errors.documentRequired"))
            return
        }

        if (text.length > CONTENT_LIMITS.document) {
            setAddError(t("errors.documentMax", { max: CONTENT_LIMITS.document }))
            return
        }

        setAddError(null)
        setDraftText("")
        onChange([...documents, text])
    }

    function edit(index: number, value: string) {
        onChange(documents.map((document, position) => (position === index ? value : document)))
    }

    function remove(index: number) {
        onChange(documents.filter((_, position) => position !== index))
    }

    function move(index: number, direction: "up" | "down") {
        const target = direction === "up" ? index - 1 : index + 1

        if (target < 0 || target >= documents.length) {
            return
        }

        const next = [...documents]
        next[index] = documents[target]
        next[target] = documents[index]
        onChange(next)
    }

    function rowError(index: number): string | null {
        const error = errors.find((item) => item.field === `requiredDocuments.${index}`)

        return error ? contentErrorText(t, error) : null
    }

    const listError = errors.find((item) => item.field === "requiredDocuments")

    return (
        <div className={css.documents}>
            {documents.length > 0 ? (
                <ul id={listId} className={css.documentsList}>
                    {documents.map((document, index) => (
                        <li
                            key={index}
                            className={
                                repeated.has(index)
                                    ? `${css.documentRow} ${css.documentRepeated}`
                                    : css.documentRow
                            }
                        >
                            <div className={css.documentField}>
                                <input
                                    type="text"
                                    className={css.input}
                                    value={document}
                                    aria-label={t("documentsField.edit", { index: index + 1 })}
                                    aria-invalid={rowError(index) ? true : undefined}
                                    onChange={(event) => edit(index, event.target.value)}
                                />
                                {repeated.has(index) ? (
                                    <p className={css.documentWarning}>
                                        {t("documentsField.repeated")}
                                    </p>
                                ) : null}
                                {rowError(index) ? (
                                    <p className={css.error}>{rowError(index)}</p>
                                ) : null}
                            </div>
                            <div className={css.documentActions}>
                                <button
                                    type="button"
                                    className={css.iconButton}
                                    aria-label={t("documentsField.moveUp")}
                                    disabled={index === 0}
                                    onClick={() => move(index, "up")}
                                >
                                    {t("icons.up")}
                                </button>
                                <button
                                    type="button"
                                    className={css.iconButton}
                                    aria-label={t("documentsField.moveDown")}
                                    disabled={index === documents.length - 1}
                                    onClick={() => move(index, "down")}
                                >
                                    {t("icons.down")}
                                </button>
                                <button
                                    type="button"
                                    className={`${css.iconButton} ${css.removeButton}`}
                                    aria-label={t("documentsField.remove")}
                                    onClick={() => remove(index)}
                                >
                                    {t("icons.remove")}
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : null}
            {listError ? <p className={css.error}>{contentErrorText(t, listError)}</p> : null}
            <input
                type="text"
                className={css.input}
                value={draftText}
                placeholder={t("documentsField.addPlaceholder")}
                aria-label={t("documentsField.addPlaceholder")}
                aria-invalid={addError ? true : undefined}
                disabled={full}
                onChange={(event) => setDraftText(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === "Enter") {
                        event.preventDefault()
                        add()
                    }
                }}
            />
            {addError ? <p className={css.error}>{addError}</p> : null}
            <button type="button" className={css.addDocument} disabled={full} onClick={add}>
                {t("documentsField.add")}
            </button>
            {full ? (
                <span className={css.documentsLimit}>
                    {t("documentsField.limit", { max: CONTENT_LIMITS.documentsCount })}
                </span>
            ) : null}
        </div>
    )
}

export default ContentDocumentsField
