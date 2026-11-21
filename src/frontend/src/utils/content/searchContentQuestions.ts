import type ContentDraftState from "@/types/content/ContentDraftState.types"
import type ContentSearchResult from "@/types/content/ContentSearchResult.types"
import normalizeComparisonText from "@/utils/content/normalizeComparisonText"

export default function searchContentQuestions(
    draft: ContentDraftState,
    term: string
): ContentSearchResult[] {
    const needle = normalizeComparisonText(term)

    if (needle === "") {
        return []
    }

    return draft.categories.flatMap((category) =>
        (draft.questionsByCategory[category.key] ?? [])
            .filter((question) =>
                [question.question, question.answer, question.shortTitle].some((text) =>
                    normalizeComparisonText(text).includes(needle)
                )
            )
            .map((question) => ({ question, category }))
    )
}
