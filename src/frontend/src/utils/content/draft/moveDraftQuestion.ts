import type ContentDraftState from "@/types/content/ContentDraftState.types"
import swapNeighbor from "@/utils/content/draft/swapNeighbor"

export default function moveDraftQuestion(
    draft: ContentDraftState,
    categoryKey: string,
    questionKey: string,
    direction: "up" | "down"
): ContentDraftState {
    const questions = draft.questionsByCategory[categoryKey] ?? []
    const index = questions.findIndex((question) => question.key === questionKey)
    const moved = swapNeighbor(questions, index, direction)

    if (moved === null) {
        return draft
    }

    return { ...draft, questionsByCategory: { ...draft.questionsByCategory, [categoryKey]: moved } }
}
