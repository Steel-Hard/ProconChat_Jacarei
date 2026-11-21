import type ContentCategoryFormFields from "@/types/content/ContentCategoryFormFields.types"
import type ContentFieldError from "@/types/content/ContentFieldError.types"

type ContentCategoryFormProps = {
    mode: "new" | "edit"
    initial: ContentCategoryFormFields
    validate: (fields: ContentCategoryFormFields) => ContentFieldError[]
    onConfirm: (fields: ContentCategoryFormFields) => void
    onCancel: () => void
}

export default ContentCategoryFormProps
