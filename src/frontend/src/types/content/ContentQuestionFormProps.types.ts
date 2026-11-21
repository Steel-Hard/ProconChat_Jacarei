import type { ReactNode } from "react"
import type ContentQuestionFormFields from "@/types/content/ContentQuestionFormFields.types"
import type ContentValidation from "@/types/content/ContentValidation.types"

type ContentQuestionFormProps = {
    mode: "new" | "edit"
    initial: ContentQuestionFormFields
    validate: (fields: ContentQuestionFormFields) => ContentValidation
    onConfirm: (fields: ContentQuestionFormFields) => void
    onCancel: () => void
    onPreview?: () => void
    onChange?: (fields: ContentQuestionFormFields) => void
    previewSlot?: ReactNode
    crumb?: string | null
    meta?: string | null
}

export default ContentQuestionFormProps
