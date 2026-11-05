import { useId } from "react"
import { useTranslation } from "react-i18next"
import type AttendeeGroup from "@/types/documents/AttendeeGroup.types"
import type SampleQuestion from "@/types/documents/SampleQuestion.types"
import css from "@/styles/components/documentsPreview.module.css"

export type DocumentsPreviewProps = {
    attendeeGroup: AttendeeGroup
    onChangeAttendeeGroup: (group: AttendeeGroup) => void
    sampleQuestions: SampleQuestion[]
    selectedQuestionId: string
    onChangeQuestionId: (id: string) => void
    confirmationText: string
    duplicateDocs: Set<string>
    isUnsaved: boolean
    isQuestionEmpty: boolean
}

export function DocumentsPreview({
    attendeeGroup,
    onChangeAttendeeGroup,
    sampleQuestions,
    selectedQuestionId,
    onChangeQuestionId,
    confirmationText,
    duplicateDocs,
    isUnsaved,
    isQuestionEmpty
}: DocumentsPreviewProps) {
    const { t } = useTranslation("documents")
    const attendeeId = useId()
    const questionId = useId()

    const lines = confirmationText.split("\n")

    return (
        <section className={css.previewCard} aria-labelledby="preview-heading">
            <div className={css.header}>
                <h2 id="preview-heading" className={css.title}>
                    {t("preview.title")}
                </h2>
                <p className={css.subtitle}>{t("preview.subtitle")}</p>
            </div>

            <div className={css.selectors}>
                <div className={css.fieldGroup}>
                    <label htmlFor={attendeeId} className={css.label}>
                        {t("preview.attendeeLabel")}
                    </label>
                    <select
                        id={attendeeId}
                        className={css.select}
                        value={attendeeGroup}
                        onChange={(e) => onChangeAttendeeGroup(e.target.value as AttendeeGroup)}
                    >
                        <option value="holder">{t("preview.attendeeHolder")}</option>
                        <option value="representative">
                            {t("preview.attendeeRepresentative")}
                        </option>
                    </select>
                </div>

                <div className={css.fieldGroup}>
                    <label htmlFor={questionId} className={css.label}>
                        {t("preview.questionLabel")}
                    </label>
                    <select
                        id={questionId}
                        className={css.select}
                        value={selectedQuestionId}
                        onChange={(e) => onChangeQuestionId(e.target.value)}
                    >
                        {sampleQuestions.map((q) => (
                            <option key={q.id} value={q.id}>
                                {q.title}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className={css.notices}>
                {isUnsaved ? (
                    <div role="status" className={css.unsavedNotice}>
                        {t("preview.unsavedNotice")}
                    </div>
                ) : null}

                {isQuestionEmpty ? (
                    <div role="status" className={css.noDocsNotice}>
                        {t("preview.noQuestionDocsNotice")}
                    </div>
                ) : null}
            </div>

            <div className={css.chatPreview}>
                <div className={css.bubble} data-testid="preview-bubble">
                    {lines.map((line, idx) => {
                        if (line.startsWith("• ")) {
                            const docText = line.slice(2).trim()
                            const isDuplicate = duplicateDocs.has(docText)

                            if (isDuplicate) {
                                return (
                                    <span key={idx}>
                                        •{" "}
                                        <mark
                                            className={css.repeatedItem}
                                            title={t("preview.duplicateTooltip")}
                                        >
                                            {docText}
                                        </mark>
                                        <span className={css.repeatedBadge}>
                                            {t("preview.duplicateBadge")}
                                        </span>
                                    </span>
                                )
                            }
                        }

                        if (idx === 0) {
                            return (
                                <strong key={idx} className={css.bubbleHeading}>
                                    {line}
                                </strong>
                            )
                        }

                        return <span key={idx}>{line || "\u00A0"}</span>
                    })}
                </div>
            </div>
        </section>
    )
}

export default DocumentsPreview
