import type ContentDraftState from "@/types/content/ContentDraftState.types"
import type ContentQuestionFormFields from "@/types/content/ContentQuestionFormFields.types"
import normalizeQuestionFields from "@/utils/content/draft/normalizeQuestionFields"

export default function updateDraftQuestion(
    draft: ContentDraftState,
    categoryKey: string,
    questionKey: string,
    fields: ContentQuestionFormFields
): ContentDraftState {
    return {
        ...draft,
        questionsByCategory: {
            ...draft.questionsByCategory,
            [categoryKey]: (draft.questionsByCategory[categoryKey] ?? []).map((question) =>
                question.key === questionKey
                    ? { ...question, ...normalizeQuestionFields(fields, question.outOfScope) }
                    : question
            )
        }
    }
}
