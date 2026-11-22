import type ContentDraftState from "@/types/content/ContentDraftState.types"
import swapNeighbor from "@/utils/content/draft/swapNeighbor"

export default function moveDraftCategory(
    draft: ContentDraftState,
    categoryKey: string,
    direction: "up" | "down"
): ContentDraftState {
    const index = draft.categories.findIndex((category) => category.key === categoryKey)
    const categories = swapNeighbor(draft.categories, index, direction)

    return categories === null ? draft : { ...draft, categories }
}
