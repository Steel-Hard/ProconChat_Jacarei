import type ContentDraftState from "@/types/content/ContentDraftState.types"

export default function setDraftCategoryActive(
    draft: ContentDraftState,
    categoryKey: string,
    active: boolean
): ContentDraftState {
    return {
        ...draft,
        categories: draft.categories.map((category) =>
            category.key === categoryKey ? { ...category, active } : category
        )
    }
}
