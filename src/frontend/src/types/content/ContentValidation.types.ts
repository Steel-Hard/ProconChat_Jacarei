import type ContentFieldError from "@/types/content/ContentFieldError.types"

type ContentValidation = {
    valid: boolean
    errors: ContentFieldError[]
    warnings: ContentFieldError[]
}

export default ContentValidation
