import type ContentDraftState from "@/types/content/ContentDraftState.types"
import type ContentPreviewListRowInput from "@/types/content/ContentPreviewListRowInput.types"

type CurrentQuestion = {
    key: string | null
    shortTitle: string
    shortDescription: string
}

function nullIfEmpty(value: string): string | null {
    const trimmed = value.trim()

    return trimmed === "" ? null : trimmed
}

export default function buildPreviewListRows(
    draft: ContentDraftState,
    categoryKey: string,
    current: CurrentQuestion
): ContentPreviewListRowInput[] {
    const questions = draft.questionsByCategory[categoryKey] ?? []
    const rows: ContentPreviewListRowInput[] = questions
        .filter((question) => question.active || question.key === current.key)
        .map((question) =>
            question.key === current.key
                ? {
                      questionId: question.id,
                      shortTitle: current.shortTitle.trim(),
                      shortDescription: nullIfEmpty(current.shortDescription),
                      isCurrent: true
                  }
                : {
                      questionId: question.id,
                      shortTitle: question.shortTitle.trim(),
                      shortDescription: nullIfEmpty(question.shortDescription),
                      isCurrent: false
                  }
        )

    if (current.key === null) {
        rows.push({
            questionId: null,
            shortTitle: current.shortTitle.trim(),
            shortDescription: nullIfEmpty(current.shortDescription),
            isCurrent: true
        })
    }

    return rows
}
