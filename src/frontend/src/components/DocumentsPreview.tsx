import { useId } from "react"
import { useTranslation } from "react-i18next"
import DocumentsQuestionPicker from "@/components/DocumentsQuestionPicker"
import DocumentsPreviewBlock from "@/components/DocumentsPreviewBlock"
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
    isQuestionEmpty,
    isUpdating
}: DocumentsPreviewProps) {
    const { t } = useTranslation("documents")
    const headingId = useId()
    const exampleLabels = [t("preview.exampleLabels.protocol"), t("preview.exampleLabels.dateTime")]

    return (
        <section className={css.previewCard} aria-labelledby={headingId}>
            <div className={css.controls}>
                <div>
                    <h2 id={headingId} className={css.title}>
                        {t("preview.title")}
                    </h2>
                    <p className={css.subtitle}>{t("preview.subtitle")}</p>
                </div>

                <fieldset className={css.attendeeGroup}>
                    <legend className={css.label}>{t("preview.attendeeLabel")}</legend>
                    <div className={css.segmented}>
                        {(["holder", "representative"] as const).map((group) => (
                            <button
                                key={group}
                                type="button"
                                className={
                                    group === attendeeGroup
                                        ? `${css.segment} ${css.segmentActive}`
                                        : css.segment
                                }
                                aria-pressed={group === attendeeGroup}
                                onClick={() => onChangeAttendeeGroup(group)}
                            >
                                {t(`preview.attendee.${group}`)}
                            </button>
                        ))}
                    </div>
                </fieldset>

                <DocumentsQuestionPicker
                    questions={sampleQuestions}
                    selectedId={selectedQuestionId}
                    onChange={onChangeQuestionId}
                />

                {preview !== null && preview.groupBlock === null ? (
                    <output className={css.emptyGroupAlert}>
                        {t(`groups.${attendeeGroup}.emptyAlert`)}
                    </output>
                ) : null}

                {preview !== null && preview.repeatedCount > 0 ? (
                    <p className={css.repeatedLegend}>
                        <i className={css.repeatedSwatch} aria-hidden="true" />
                        <span>{t("preview.repeatedLegend", { count: preview.repeatedCount })}</span>
                    </p>
                ) : null}

                {isQuestionEmpty ? (
                    <output className={css.note}>{t("preview.noQuestionDocsNotice")}</output>
                ) : null}

                {isUnsaved ? (
                    <output className={css.draftNote}>{t("preview.unsavedNotice")}</output>
                ) : null}

                {isUpdating ? <output className={css.note}>{t("preview.updating")}</output> : null}

                {hasPreviewError ? (
                    <p role="alert" className={css.errorNote}>
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
                                            {exampleLabels.includes(detail.label) ? (
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
                            <p className={css.block}>{preview.notice}</p>
                        </>
                    ) : null}
                </div>
            </div>
        </section>
    )
}
