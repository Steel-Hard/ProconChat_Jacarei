import { Fragment, useId } from "react"
import { useTranslation } from "react-i18next"
import DocumentsQuestionPicker from "@/components/DocumentsQuestionPicker"
import WhatsAppMessageBubble from "@/components/WhatsAppMessageBubble"
import type DocumentsPreviewProps from "@/types/documents/DocumentsPreviewProps.types"
import buildPreviewLines from "@/utils/documents/buildPreviewLines"
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

                {isQuestionEmpty ? (
                    <output className={css.note}>{t("preview.noQuestionDocsNotice")}</output>
                ) : null}

                {isUnsaved ? (
                    <output className={css.draftNote}>{t("preview.unsavedNotice")}</output>
                ) : null}

                <div className={css.updatingSlot}>
                    {isUpdating ? (
                        <output className={css.updating} data-updating="true">
                            {t("preview.updating")}
                        </output>
                    ) : null}
                </div>

                {hasPreviewError ? (
                    <p role="alert" className={css.errorNote}>
                        {t("preview.loadFailed")}
                    </p>
                ) : null}
            </div>

            <div className={css.chatColumn}>
                <div className={css.chatPreview}>
                    <div data-testid="preview-bubble">
                        {preview !== null ? (
                            <WhatsAppMessageBubble
                                text={buildPreviewLines(preview).map((line, index, lines) => (
                                    <Fragment key={index}>
                                        {line.repeated ? (
                                            <mark className={css.repeatedItem}>{line.text}</mark>
                                        ) : (
                                            <span>{line.text}</span>
                                        )}
                                        {index < lines.length - 1 ? "\n" : null}
                                    </Fragment>
                                ))}
                                time={t("preview.messageTime")}
                            />
                        ) : null}
                    </div>
                </div>
                <div className={css.chatNotes}>
                    <p className={css.note}>{t("preview.exampleNote")}</p>
                    {preview !== null && preview.repeatedCount > 0 ? (
                        <p className={css.repeatedLegend}>
                            <i className={css.repeatedSwatch} aria-hidden="true" />
                            <span>
                                {t("preview.repeatedLegend", { count: preview.repeatedCount })}
                            </span>
                        </p>
                    ) : null}
                </div>
            </div>
        </section>
    )
}
