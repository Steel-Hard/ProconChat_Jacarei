import type ContentCategoryInput from "@/types/content/ContentCategoryInput.types"
import type ContentDraftCategory from "@/types/content/ContentDraftCategory.types"
import type ContentDraftQuestion from "@/types/content/ContentDraftQuestion.types"
import type ContentDraftState from "@/types/content/ContentDraftState.types"
import type ContentQuestionInput from "@/types/content/ContentQuestionInput.types"
import type ContentSavePlanStep from "@/types/content/ContentSavePlanStep.types"
import type ContentSnapshot from "@/types/content/ContentSnapshot.types"
import { categoryFieldsChanged, questionFieldsChanged } from "@/utils/content/contentFieldDiff"
import { draftCategoryOf, draftQuestionOf } from "@/utils/content/draft/deriveContentDraft"

function nullIfEmpty(value: string): string | null {
    const trimmed = value.trim()

    return trimmed === "" ? null : trimmed
}

function categoryInputOf(category: ContentDraftCategory): ContentCategoryInput {
    return {
        title: category.title.trim(),
        shortTitle: category.shortTitle.trim(),
        description: nullIfEmpty(category.description)
    }
}

function questionInputOf(question: ContentDraftQuestion): ContentQuestionInput {
    return {
        shortTitle: question.shortTitle.trim(),
        shortDescription: nullIfEmpty(question.shortDescription),
        question: question.question.trim(),
        answer: question.answer.trim(),
        legalBasis: nullIfEmpty(question.legalBasis),
        requiredDocuments: question.requiredDocuments.map((document) => document.trim()),
        requiresInPerson: question.requiresInPerson,
        inPersonNote: question.requiresInPerson ? nullIfEmpty(question.inPersonNote) : null,
        outOfScope: question.outOfScope,
        llmAllowed: question.outOfScope ? false : question.llmAllowed,
        active: question.active
    }
}

function sameOrder(first: string[], second: string[]): boolean {
    return first.length === second.length && first.every((key, index) => key === second[index])
}

function expectedOrder(savedKeys: string[], draftKeys: string[]): string[] {
    const saved = new Set(savedKeys)

    return [...savedKeys, ...draftKeys.filter((key) => !saved.has(key))]
}

export default function buildContentSavePlan(
    snapshot: ContentSnapshot,
    draft: ContentDraftState
): ContentSavePlanStep[] {
    const savedCategories = new Map(
        snapshot.categories.map((category) => [String(category.id), draftCategoryOf(category)])
    )
    const savedQuestionsOf = (category: ContentDraftCategory) =>
        new Map(
            (snapshot.questionsByCategory[category.id ?? -1] ?? []).map((question) => [
                String(question.id),
                draftQuestionOf(question)
            ])
        )
    const plan: ContentSavePlanStep[] = []

    draft.categories.forEach((category) => {
        if (!savedCategories.has(category.key)) {
            plan.push({
                kind: "createCategory",
                categoryKey: category.key,
                input: categoryInputOf(category)
            })
        }
    })

    draft.categories.forEach((category) => {
        const saved = savedCategories.get(category.key)

        if (saved === undefined) {
            if (!category.active) {
                plan.push({ kind: "setCategoryActive", categoryKey: category.key, active: false })
            }
        } else if (categoryFieldsChanged(category, saved)) {
            plan.push({
                kind: "updateCategory",
                categoryKey: category.key,
                input: { ...categoryInputOf(category), active: category.active }
            })
        } else if (category.active !== saved.active) {
            plan.push({
                kind: "setCategoryActive",
                categoryKey: category.key,
                active: category.active
            })
        }
    })

    draft.categories.forEach((category) => {
        const saved = savedQuestionsOf(category)

        ;(draft.questionsByCategory[category.key] ?? []).forEach((question) => {
            if (!saved.has(question.key)) {
                plan.push({
                    kind: "createQuestion",
                    questionKey: question.key,
                    categoryKey: category.key,
                    input: questionInputOf(question)
                })
            }
        })
    })

    draft.categories.forEach((category) => {
        const saved = savedQuestionsOf(category)

        ;(draft.questionsByCategory[category.key] ?? []).forEach((question) => {
            const savedQuestion = saved.get(question.key)

            if (savedQuestion === undefined) {
                return
            }

            if (questionFieldsChanged(question, savedQuestion)) {
                plan.push({
                    kind: "updateQuestion",
                    questionKey: question.key,
                    input: questionInputOf(question)
                })
            } else if (question.active !== savedQuestion.active) {
                plan.push({
                    kind: "setQuestionActive",
                    questionKey: question.key,
                    active: question.active
                })
            }
        })
    })

    const draftCategoryKeys = draft.categories.map((category) => category.key)

    if (
        !sameOrder(draftCategoryKeys, expectedOrder([...savedCategories.keys()], draftCategoryKeys))
    ) {
        plan.push({ kind: "reorderCategories", categoryKeys: draftCategoryKeys })
    }

    draft.categories.forEach((category) => {
        const draftKeys = (draft.questionsByCategory[category.key] ?? []).map(
            (question) => question.key
        )
        const expected = expectedOrder([...savedQuestionsOf(category).keys()], draftKeys)

        if (!sameOrder(draftKeys, expected)) {
            plan.push({
                kind: "reorderQuestions",
                categoryKey: category.key,
                questionKeys: draftKeys
            })
        }
    })

    return plan
}
