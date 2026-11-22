import type ContentDraftQuestion from "@/types/content/ContentDraftQuestion.types"
import type ContentDraftState from "@/types/content/ContentDraftState.types"

export default function applyCreatedIds(
    draft: ContentDraftState,
    idMap: Record<string, number>
): ContentDraftState {
    const keyOf = (key: string) => (key in idMap ? String(idMap[key]) : key)
    const questionsByCategory: Record<string, ContentDraftQuestion[]> = {}

    Object.entries(draft.questionsByCategory).forEach(([categoryKey, questions]) => {
        const nextCategoryKey = keyOf(categoryKey)

        questionsByCategory[nextCategoryKey] = questions.map((question) =>
            question.key in idMap
                ? {
                      ...question,
                      key: String(idMap[question.key]),
                      id: idMap[question.key],
                      categoryKey: nextCategoryKey
                  }
                : { ...question, categoryKey: nextCategoryKey }
        )
    })

    return {
        ...draft,
        categories: draft.categories.map((category) =>
            category.key in idMap
                ? { ...category, key: String(idMap[category.key]), id: idMap[category.key] }
                : category
        ),
        questionsByCategory
    }
}
