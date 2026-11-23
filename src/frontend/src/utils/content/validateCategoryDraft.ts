import type ContentFieldError from "@/types/content/ContentFieldError.types"
import type ContentValidation from "@/types/content/ContentValidation.types"
import CONTENT_LIMITS from "@/utils/content/contentLimits"
import hasControlChars from "@/utils/content/hasControlChars"
import normalizeComparisonText from "@/utils/content/normalizeComparisonText"

type CategoryFields = {
    key: string
    title: string
    shortTitle: string
    description: string
}

type OtherCategory = {
    key: string
    title: string
}

export default function validateCategoryDraft(
    category: CategoryFields,
    others: OtherCategory[]
): ContentValidation {
    const errors: ContentFieldError[] = []
    const shortTitle = category.shortTitle.trim()
    const title = category.title.trim()
    const description = category.description.trim()

    if (shortTitle === "") {
        errors.push({ field: "shortTitle", key: "errors.shortTitleRequired" })
    } else if (shortTitle.length > CONTENT_LIMITS.shortTitle) {
        errors.push({
            field: "shortTitle",
            key: "errors.shortTitleMax",
            params: { max: CONTENT_LIMITS.shortTitle }
        })
    } else if (hasControlChars(shortTitle)) {
        errors.push({ field: "shortTitle", key: "errors.noLineBreaks" })
    }

    if (title === "") {
        errors.push({ field: "title", key: "errors.titleRequired" })
    } else if (title.length > CONTENT_LIMITS.categoryTitle) {
        errors.push({
            field: "title",
            key: "errors.titleMax",
            params: { max: CONTENT_LIMITS.categoryTitle }
        })
    } else if (hasControlChars(title)) {
        errors.push({ field: "title", key: "errors.noLineBreaks" })
    } else {
        const normalized = normalizeComparisonText(title)
        const repeated = others.some(
            (other) =>
                other.key !== category.key && normalizeComparisonText(other.title) === normalized
        )

        if (repeated) {
            errors.push({ field: "title", key: "duplicateCategoryName" })
        }
    }

    if (description.length > CONTENT_LIMITS.categoryDescription) {
        errors.push({
            field: "description",
            key: "errors.descriptionMax",
            params: { max: CONTENT_LIMITS.categoryDescription }
        })
    }

    return { valid: errors.length === 0, errors, warnings: [] }
}
