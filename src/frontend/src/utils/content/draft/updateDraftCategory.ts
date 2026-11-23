import type ContentCategoryFormFields from "@/types/content/ContentCategoryFormFields.types"
import type ContentDraftState from "@/types/content/ContentDraftState.types"

export default function updateDraftCategory(
    draft: ContentDraftState,
    categoryKey: string,
    fields: ContentCategoryFormFields
): ContentDraftState {
    return {
        ...draft,
        categories: draft.categories.map((category) =>
            category.key === categoryKey ? { ...category, ...fields } : category
        )
    }
}
