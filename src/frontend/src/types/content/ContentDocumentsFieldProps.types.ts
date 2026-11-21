import type ContentFieldError from "@/types/content/ContentFieldError.types"

type ContentDocumentsFieldProps = {
    documents: string[]
    errors: ContentFieldError[]
    onChange: (documents: string[]) => void
}

export default ContentDocumentsFieldProps
