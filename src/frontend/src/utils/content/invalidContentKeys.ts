import type ContentDraftState from "@/types/content/ContentDraftState.types"
import validateCategoryDraft from "@/utils/content/validateCategoryDraft"
import validateQuestionDraft from "@/utils/content/validateQuestionDraft"

export default function invalidContentKeys(draft: ContentDraftState): {
    keys: Set<string>
    first: string | null
} {
    const keys = new Set<string>()
    let first: string | null = null
    const others = draft.categories.map(({ key, title }) => ({ key, title }))

    draft.categories.forEach((category) => {
        if (!validateCategoryDraft(category, others).valid) {
            keys.add(category.key)
            first ??= category.shortTitle
        }

        ;(draft.questionsByCategory[category.key] ?? []).forEach((question) => {
            if (!validateQuestionDraft(question).valid) {
                keys.add(question.key)
                first ??= question.shortTitle
            }
        })
    })

    return { keys, first }
}
