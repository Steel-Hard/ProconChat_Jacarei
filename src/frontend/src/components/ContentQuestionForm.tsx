import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import ContentCheckField from "@/components/ContentCheckField"
import ContentDocumentsField from "@/components/ContentDocumentsField"
import ContentFormDialog from "@/components/ContentFormDialog"
import ContentTextField from "@/components/ContentTextField"
import type ContentFieldError from "@/types/content/ContentFieldError.types"
import type ContentQuestionFormFields from "@/types/content/ContentQuestionFormFields.types"
import type ContentQuestionFormProps from "@/types/content/ContentQuestionFormProps.types"
import contentErrorText from "@/utils/content/contentErrorText"
import CONTENT_LIMITS from "@/utils/content/contentLimits"
import css from "@/styles/components/contentForms.module.css"

function ContentQuestionForm({
    mode,
    initial,
    validate,
    onConfirm,
    onCancel,
    onPreview,
    onChange,
    previewSlot
}: ContentQuestionFormProps) {
    const { t } = useTranslation("content")
    const [fields, setFields] = useState<ContentQuestionFormFields>(initial)
    const [attempted, setAttempted] = useState(false)
    const onChangeRef = useRef(onChange)
    const errors: ContentFieldError[] = attempted ? validate(fields).errors : []

    useEffect(() => {
        onChangeRef.current = onChange
    }, [onChange])

    useEffect(() => {
        onChangeRef.current?.(fields)
    }, [fields])

    function errorOf(field: string): string | null {
        const error = errors.find((item) => item.field === field)

        return error ? contentErrorText(t, error) : null
    }

    function patch(next: Partial<ContentQuestionFormFields>) {
        setFields((current) => ({ ...current, ...next }))
    }

    function toggleOutOfScope(checked: boolean) {
        if (checked) {
            patch({
                outOfScope: true,
                llmAllowed: false,
                requiresInPerson: false,
                inPersonNote: ""
            })
            return
        }

        patch({ outOfScope: false, llmAllowed: true })
    }

    function toggleInPerson(checked: boolean) {
        patch(checked ? { requiresInPerson: true } : { requiresInPerson: false, inPersonNote: "" })
    }

    function confirm() {
        setAttempted(true)

        if (validate(fields).valid) {
            onConfirm(fields)
        }
    }

    const crossErrors = errors.filter(
        (item) => item.field === "outOfScope" || item.field === "llmAllowed"
    )

    return (
        <ContentFormDialog
            wide
            title={mode === "new" ? t("questionForm.titleNew") : t("questionForm.titleEdit")}
            summary={errors.length > 0 ? t("saveInvalid") : null}
            confirmLabel={t("questionForm.confirm")}
            cancelLabel={t("questionForm.cancel")}
            previewLabel={t("questionForm.preview")}
            onPreview={onPreview}
            onConfirm={confirm}
            onCancel={onCancel}
        >
            {mode === "edit" ? (
                <p className={css.guidance}>{t("questionForm.editGuidance")}</p>
            ) : null}
            <div className={css.section}>
                <div className={css.twoColumns}>
                    <ContentTextField
                        label={t("questionForm.shortTitle")}
                        value={fields.shortTitle}
                        max={CONTENT_LIMITS.shortTitle}
                        error={errorOf("shortTitle")}
                        onChange={(value) => patch({ shortTitle: value })}
                    />
                    <ContentTextField
                        label={t("questionForm.shortDescription")}
                        value={fields.shortDescription}
                        max={CONTENT_LIMITS.shortDescription}
                        optional
                        error={errorOf("shortDescription")}
                        onChange={(value) => patch({ shortDescription: value })}
                    />
                </div>
                <ContentTextField
                    label={t("questionForm.question")}
                    value={fields.question}
                    max={CONTENT_LIMITS.question}
                    multiline
                    error={errorOf("question")}
                    onChange={(value) => patch({ question: value })}
                />
                <ContentTextField
                    label={t("questionForm.answer")}
                    value={fields.answer}
                    max={CONTENT_LIMITS.answer}
                    multiline
                    tall
                    error={errorOf("answer")}
                    onChange={(value) => patch({ answer: value })}
                />
                {fields.answer.length >= CONTENT_LIMITS.answerWarningFrom ? (
                    <p className={css.longAnswerAlert}>{t("questionForm.answerWarning")}</p>
                ) : null}
                <ContentTextField
                    label={t("questionForm.legalBasis")}
                    value={fields.legalBasis}
                    max={CONTENT_LIMITS.legalBasis}
                    optional
                    placeholder={t("questionForm.legalBasisPlaceholder")}
                    error={errorOf("legalBasis")}
                    onChange={(value) => patch({ legalBasis: value })}
                />
            </div>
            <div className={css.section}>
                <span className={css.sectionTitle}>{t("questionForm.documents")}</span>
                <p className={css.hint}>{t("questionForm.documentsHint")}</p>
                <ContentDocumentsField
                    documents={fields.requiredDocuments}
                    errors={errors.filter((item) => item.field.startsWith("requiredDocuments"))}
                    onChange={(documents) => patch({ requiredDocuments: documents })}
                />
            </div>
            <div className={css.section}>
                <div className={css.checks}>
                    <ContentCheckField
                        label={t("questionForm.requiresInPerson")}
                        hint={t("questionForm.requiresInPersonHint")}
                        checked={fields.requiresInPerson}
                        disabled={fields.outOfScope}
                        onChange={toggleInPerson}
                    />
                    {fields.requiresInPerson ? (
                        <ContentTextField
                            label={t("questionForm.inPersonNote")}
                            value={fields.inPersonNote}
                            max={CONTENT_LIMITS.inPersonNote}
                            optional
                            multiline
                            error={errorOf("inPersonNote")}
                            onChange={(value) => patch({ inPersonNote: value })}
                        />
                    ) : null}
                    <ContentCheckField
                        label={t("questionForm.outOfScope")}
                        hint={t("questionForm.outOfScopeHint")}
                        checked={fields.outOfScope}
                        disabled={fields.requiresInPerson}
                        onChange={toggleOutOfScope}
                    />
                    <ContentCheckField
                        label={t("questionForm.llmAllowed")}
                        hint={t("questionForm.llmAllowedHint")}
                        checked={fields.llmAllowed}
                        disabled={fields.outOfScope}
                        onChange={(checked) => patch({ llmAllowed: checked })}
                    />
                    <ContentCheckField
                        label={t("questionForm.active")}
                        checked={fields.active}
                        onChange={(checked) => patch({ active: checked })}
                    />
                    {crossErrors.map((error) => (
                        <p key={error.field} className={css.error}>
                            {contentErrorText(t, error)}
                        </p>
                    ))}
                </div>
            </div>
            {previewSlot}
        </ContentFormDialog>
    )
}

export default ContentQuestionForm
