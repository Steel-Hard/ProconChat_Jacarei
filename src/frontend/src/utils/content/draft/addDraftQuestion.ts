import type ContentDraftState from "@/types/content/ContentDraftState.types"
import type ContentQuestionFormFields from "@/types/content/ContentQuestionFormFields.types"
import normalizeQuestionFields from "@/utils/content/draft/normalizeQuestionFields"

export default function addDraftQuestion(
    draft: ContentDraftState,
    categoryKey: string,
    fields: ContentQuestionFormFields
): ContentDraftState {
    const key = `nova-${draft.nextNewKey}`
    const normalized = normalizeQuestionFields(
        { ...fields, active: true, llmAllowed: !fields.outOfScope },
        false
    )

    return {
        ...draft,
        questionsByCategory: {
            ...draft.questionsByCategory,
            [categoryKey]: [
                ...(draft.questionsByCategory[categoryKey] ?? []),
                {
                    ...normalized,
                    key,
                    id: null,
                    categoryKey,
                    updatedBy: null,
                    updatedAt: null
                }
            ]
        },
        nextNewKey: draft.nextNewKey + 1
    }
}
