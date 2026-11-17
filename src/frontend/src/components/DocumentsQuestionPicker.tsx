import { useId } from "react"
import { useTranslation } from "react-i18next"
import type SampleQuestion from "@/types/documents/SampleQuestion.types"
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
    const selectId = useId()

    if (questions.length === 0) {
        return (
            <div className={css.fieldGroup}>
                <output className={css.note}>{t("preview.noQuestionsNotice")}</output>
            </div>
        )
    }

    return (
        <div className={css.fieldGroup}>
            <label htmlFor={selectId} className={css.label}>
                {t("preview.questionLabel")}
            </label>
            <select
                id={selectId}
                className={css.select}
                value={selectedId}
                onChange={(event) => onChange(event.target.value)}
            >
                {groupSampleQuestions(questions).map((group) => (
                    <optgroup key={group.categoryTitle} label={group.categoryTitle}>
                        {group.questions.map((question) => (
                            <option key={question.id} value={question.id}>
                                {question.title}
                            </option>
                        ))}
                    </optgroup>
                ))}
            </select>
        </div>
    )
}

export default DocumentsQuestionPicker
