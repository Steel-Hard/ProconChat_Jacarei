import type ContentDraftCategory from "@/types/content/ContentDraftCategory.types"
import type ContentDraftQuestion from "@/types/content/ContentDraftQuestion.types"
import type ContentDraftState from "@/types/content/ContentDraftState.types"
import type ContentSnapshot from "@/types/content/ContentSnapshot.types"
import { draftCategoryOf, draftQuestionOf } from "@/utils/content/draft/deriveContentDraft"

function mergeQuestions(
    kept: ContentDraftQuestion[],
    server: ContentDraftQuestion[]
): ContentDraftQuestion[] {
    const serverByKey = new Map(server.map((question) => [question.key, question]))
    const keptKeys = new Set(kept.map((question) => question.key))
    const refreshed = kept.map((question) => {
        const fromServer = serverByKey.get(question.key)

        return fromServer
            ? { ...question, updatedBy: fromServer.updatedBy, updatedAt: fromServer.updatedAt }
            : question
    })

    return [...refreshed, ...server.filter((question) => !keptKeys.has(question.key))]
}

export default function reapplyDraftOnSnapshot(
    draft: ContentDraftState,
    snapshot: ContentSnapshot
): ContentDraftState {
    const serverCategories = snapshot.categories.map(draftCategoryOf)
    const serverByKey = new Map(serverCategories.map((category) => [category.key, category]))
    const keptKeys = new Set(draft.categories.map((category) => category.key))
    const refreshed: ContentDraftCategory[] = draft.categories.map((category) => {
        const fromServer = serverByKey.get(category.key)

        return fromServer
            ? { ...category, updatedBy: fromServer.updatedBy, updatedAt: fromServer.updatedAt }
            : category
    })
    const categories = [
        ...refreshed,
        ...serverCategories.filter((category) => !keptKeys.has(category.key))
    ]
    const questionsByCategory: Record<string, ContentDraftQuestion[]> = {}

    categories.forEach((category) => {
        const serverQuestions = (snapshot.questionsByCategory[category.id ?? -1] ?? []).map(
            draftQuestionOf
        )

        questionsByCategory[category.key] = mergeQuestions(
            draft.questionsByCategory[category.key] ?? [],
            serverQuestions
        )
    })

    return { ...draft, categories, questionsByCategory }
}
