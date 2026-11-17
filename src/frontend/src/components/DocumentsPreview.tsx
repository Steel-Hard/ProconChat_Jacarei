import { useId } from "react"
import { useTranslation } from "react-i18next"
import DocumentsQuestionPicker from "@/components/DocumentsQuestionPicker"
import DocumentsPreviewBlock from "@/components/DocumentsPreviewBlock"
import type AttendeeGroup from "@/types/documents/AttendeeGroup.types"
import type DocumentsPreviewProps from "@/types/documents/DocumentsPreviewProps.types"
import css from "@/styles/components/documentsPreview.module.css"

export default function DocumentsPreview({
    attendeeGroup,
    onChangeAttendeeGroup,
    sampleQuestions,
    selectedQuestionId,
    onChangeQuestionId,
    preview,
    hasPreviewError,
    isUnsaved,
    isQuestionEmpty
}: DocumentsPreviewProps) {
    const { t } = useTranslation("documents")
    const attendeeId = useId()
    const headingId = useId()

    return (
        <section className={css.previewCard} aria-labelledby={headingId}>
            <div className={css.header}>
                <h2 id={headingId} className={css.title}>
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

                <DocumentsQuestionPicker
                    questions={sampleQuestions}
                    selectedId={selectedQuestionId}
                    onChange={onChangeQuestionId}
                />
            </div>

            <div className={css.notices}>
                {isUnsaved ? (
                    <output className={css.unsavedNotice}>{t("preview.unsavedNotice")}</output>
                ) : null}

                {isQuestionEmpty ? (
                    <output className={css.noDocsNotice}>
                        {t("preview.noQuestionDocsNotice")}
                    </output>
                ) : null}

                {hasPreviewError ? (
                    <p role="alert" className={css.noDocsNotice}>
                        {t("preview.loadFailed")}
                    </p>
                ) : null}
            </div>

            <div className={css.chatPreview}>
                <div className={css.bubble} data-testid="preview-bubble">
                    {preview !== null ? (
                        <>
                            <strong className={css.bubbleHeading}>{preview.title}</strong>
                            <dl className={css.details}>
                                {preview.details.map((detail) => (
                                    <div key={detail.label} className={css.detail}>
                                        <dt>{detail.label}</dt>
                                        <dd>
                                            {detail.value}
                                            {detail.value === preview.example.protocol ||
                                            detail.value === preview.example.dateTime ? (
                                                <span className={css.exampleTag}>
                                                    {t("preview.exampleTag")}
                                                </span>
                                            ) : null}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                            {preview.groupBlock !== null ? (
                                <DocumentsPreviewBlock block={preview.groupBlock} />
                            ) : null}
                            {preview.questionBlock !== null ? (
                                <DocumentsPreviewBlock block={preview.questionBlock} />
                            ) : null}
                            {preview.repeatedCount > 0 ? (
                                <p className={css.repeatedLegend}>
                                    {t("preview.repeatedLegend", { count: preview.repeatedCount })}
                                </p>
                            ) : null}
                            <p>{preview.notice}</p>
                        </>
                    ) : null}
                </div>
            </div>
        </section>
    )
}
