import { useState } from "react"
import { useTranslation } from "react-i18next"
import ContentFormDialog from "@/components/ContentFormDialog"
import ContentTextField from "@/components/ContentTextField"
import type ContentCategoryFormFields from "@/types/content/ContentCategoryFormFields.types"
import type ContentCategoryFormProps from "@/types/content/ContentCategoryFormProps.types"
import type ContentFieldError from "@/types/content/ContentFieldError.types"
import contentErrorText from "@/utils/content/contentErrorText"
import CONTENT_LIMITS from "@/utils/content/contentLimits"
import css from "@/styles/components/contentForms.module.css"

function ContentCategoryForm({
    mode,
    initial,
    validate,
    onConfirm,
    onCancel
}: ContentCategoryFormProps) {
    const { t } = useTranslation("content")
    const [fields, setFields] = useState<ContentCategoryFormFields>(initial)
    const [attempted, setAttempted] = useState(false)
    const errors: ContentFieldError[] = attempted ? validate(fields) : []

    function errorOf(field: string): string | null {
        const error = errors.find((item) => item.field === field)

        return error ? contentErrorText(t, error) : null
    }

    function change(field: keyof ContentCategoryFormFields, value: string) {
        setFields((current) => ({ ...current, [field]: value }))
    }

    function confirm() {
        setAttempted(true)

        if (validate(fields).length === 0) {
            onConfirm(fields)
        }
    }

    return (
        <ContentFormDialog
            narrow
            title={mode === "new" ? t("categoryForm.titleNew") : t("categoryForm.titleEdit")}
            confirmLabel={t("categoryForm.confirm")}
            cancelLabel={t("categoryForm.cancel")}
            dirty={JSON.stringify(fields) !== JSON.stringify(initial)}
            onConfirm={confirm}
            onCancel={onCancel}
        >
            <div className={css.section}>
                <ContentTextField
                    label={t("categoryForm.shortTitle")}
                    value={fields.shortTitle}
                    max={CONTENT_LIMITS.shortTitle}
                    hint={t("categoryForm.shortTitleHint")}
                    error={errorOf("shortTitle")}
                    onChange={(value) => change("shortTitle", value)}
                />
                <ContentTextField
                    label={t("categoryForm.title")}
                    value={fields.title}
                    max={CONTENT_LIMITS.categoryTitle}
                    error={errorOf("title")}
                    onChange={(value) => change("title", value)}
                />
                <ContentTextField
                    label={t("categoryForm.description")}
                    value={fields.description}
                    max={CONTENT_LIMITS.categoryDescription}
                    optional
                    multiline
                    hint={t("categoryForm.descriptionHint")}
                    error={errorOf("description")}
                    onChange={(value) => change("description", value)}
                />
            </div>
        </ContentFormDialog>
    )
}

export default ContentCategoryForm
