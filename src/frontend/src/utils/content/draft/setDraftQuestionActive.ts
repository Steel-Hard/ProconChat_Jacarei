import type ContentDraftState from "@/types/content/ContentDraftState.types"

export default function setDraftQuestionActive(
    draft: ContentDraftState,
    categoryKey: string,
    questionKey: string,
    active: boolean
): ContentDraftState {
    return {
        ...draft,
        questionsByCategory: {
            ...draft.questionsByCategory,
            [categoryKey]: (draft.questionsByCategory[categoryKey] ?? []).map((question) =>
                question.key === questionKey ? { ...question, active } : question
            )
        }
    }
}
