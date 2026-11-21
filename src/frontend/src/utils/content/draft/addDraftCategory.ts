import type ContentCategoryFormFields from "@/types/content/ContentCategoryFormFields.types"
import type ContentDraftState from "@/types/content/ContentDraftState.types"

export default function addDraftCategory(
    draft: ContentDraftState,
    fields: ContentCategoryFormFields
): ContentDraftState {
    const key = `nova-${draft.nextNewKey}`

    return {
        categories: [
            ...draft.categories,
            {
                key,
                id: null,
                title: fields.title,
                shortTitle: fields.shortTitle,
                description: fields.description,
                active: true,
                updatedBy: null,
                updatedAt: null
            }
        ],
        questionsByCategory: { ...draft.questionsByCategory, [key]: [] },
        nextNewKey: draft.nextNewKey + 1
    }
}
