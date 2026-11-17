import { useId, useState } from "react"
import { useTranslation } from "react-i18next"
import type SampleQuestion from "@/types/documents/SampleQuestion.types"
import filterSampleQuestions from "@/utils/documents/filterSampleQuestions"
import groupSampleQuestions from "@/utils/documents/groupSampleQuestions"
import css from "@/styles/components/documentsPreview.module.css"

type DocumentsQuestionPickerProps = {
    questions: SampleQuestion[]
    selectedId: string
    onChange: (id: string) => void
}

function DocumentsQuestionPicker({
    questions,
    selectedId,
    onChange
}: DocumentsQuestionPickerProps) {
    const { t } = useTranslation("documents")
    const searchId = useId()
    const selectId = useId()
    const [term, setTerm] = useState("")

    const visible = filterSampleQuestions(questions, term)

    function handleSearch(value: string) {
        setTerm(value)
        const matches = filterSampleQuestions(questions, value)
        const first = matches[0]

        if (first !== undefined && !matches.some((question) => question.id === selectedId)) {
            onChange(first.id)
        }
    }

    if (questions.length === 0) {
        return (
            <div className={css.fieldGroup}>
                <output className={css.noDocsNotice}>{t("preview.noQuestionsNotice")}</output>
            </div>
        )
    }

    return (
        <div className={css.fieldGroup}>
            <label htmlFor={searchId} className={css.label}>
                {t("preview.questionSearchLabel")}
            </label>
            <input
                id={searchId}
                type="search"
                className={css.select}
                value={term}
                placeholder={t("preview.questionSearchPlaceholder")}
                onChange={(event) => handleSearch(event.target.value)}
            />
            <label htmlFor={selectId} className={css.label}>
                {t("preview.questionLabel")}
            </label>
            {visible.length === 0 ? (
                <output className={css.noDocsNotice}>{t("preview.questionSearchEmpty")}</output>
            ) : (
                <select
                    id={selectId}
                    className={css.select}
                    value={selectedId}
                    onChange={(event) => onChange(event.target.value)}
                >
                    {groupSampleQuestions(visible).map((group) => (
                        <optgroup key={group.categoryTitle} label={group.categoryTitle}>
                            {group.questions.map((question) => (
                                <option key={question.id} value={question.id}>
                                    {question.title}
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>
            )}
        </div>
    )
}

export default DocumentsQuestionPicker
