import type ContentChange from "@/types/content/ContentChange.types"
import type ContentDraftState from "@/types/content/ContentDraftState.types"
import type ContentSnapshot from "@/types/content/ContentSnapshot.types"
import {
    categoryFieldsChanged as categoryChanged,
    questionFieldsChanged as questionChanged
} from "@/utils/content/contentFieldDiff"
import { draftCategoryOf, draftQuestionOf } from "@/utils/content/draft/deriveContentDraft"

function orderChanged(draftKeys: string[], savedKeys: string[]): boolean {
    const saved = new Set(savedKeys)
    const existing = draftKeys.filter((key) => saved.has(key))
    const savedExisting = savedKeys.filter((key) => existing.includes(key))

    return existing.some((key, index) => key !== savedExisting[index])
}

export default function contentChangesOf(
    draft: ContentDraftState,
    snapshot: ContentSnapshot
): ContentChange[] {
    const changes: ContentChange[] = []
    const savedCategories = new Map(
        snapshot.categories.map((category) => [String(category.id), draftCategoryOf(category)])
    )
    const orders: ContentChange[] = []

    draft.categories.forEach((category) => {
        const saved = savedCategories.get(category.key)

        if (saved === undefined) {
            changes.push({ kind: "categoryNew", name: category.shortTitle })
        } else {
            if (categoryChanged(category, saved)) {
                changes.push({ kind: "categoryChanged", name: category.shortTitle })
            }

            if (category.active !== saved.active) {
                changes.push({
                    kind: "categoryState",
                    name: category.shortTitle,
                    active: category.active
                })
            }
        }
    })

    draft.categories.forEach((category) => {
        const savedQuestions = new Map(
            (snapshot.questionsByCategory[category.id ?? -1] ?? []).map((question) => [
                String(question.id),
                draftQuestionOf(question)
            ])
        )
        const questions = draft.questionsByCategory[category.key] ?? []

        questions.forEach((question) => {
            const saved = savedQuestions.get(question.key)

            if (saved === undefined) {
                changes.push({ kind: "questionNew", name: question.shortTitle })
                return
            }

            if (questionChanged(question, saved)) {
                changes.push({ kind: "questionChanged", name: question.shortTitle })
            }

            if (question.active !== saved.active) {
                changes.push({
                    kind: "questionState",
                    name: question.shortTitle,
                    active: question.active
                })
            }
        })

        if (
            category.id !== null &&
            orderChanged(
                questions.map((question) => question.key),
                [...savedQuestions.keys()]
            )
        ) {
            orders.push({ kind: "questionsOrder", name: category.shortTitle })
        }
    })

    if (
        orderChanged(
            draft.categories.map((category) => category.key),
            [...savedCategories.keys()]
        )
    ) {
        orders.unshift({ kind: "categoriesOrder", name: "" })
    }

    return [...changes, ...orders]
}
