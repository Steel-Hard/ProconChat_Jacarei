import type ContentDraftCategory from "@/types/content/ContentDraftCategory.types"
import type ContentDraftQuestion from "@/types/content/ContentDraftQuestion.types"

const CATEGORY_FIELDS = ["title", "shortTitle", "description"] as const
const QUESTION_FIELDS = [
    "shortTitle",
    "shortDescription",
    "question",
    "answer",
    "legalBasis",
    "requiresInPerson",
    "inPersonNote",
    "outOfScope",
    "llmAllowed"
] as const

export function categoryFieldsChanged(
    draft: ContentDraftCategory,
    saved: ContentDraftCategory
): boolean {
    return CATEGORY_FIELDS.some((field) => draft[field] !== saved[field])
}

export function questionFieldsChanged(
    draft: ContentDraftQuestion,
    saved: ContentDraftQuestion
): boolean {
    return (
        QUESTION_FIELDS.some((field) => draft[field] !== saved[field]) ||
        JSON.stringify(draft.requiredDocuments) !== JSON.stringify(saved.requiredDocuments)
    )
}
