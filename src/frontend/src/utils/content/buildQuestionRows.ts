import type ContentDraftCategory from "@/types/content/ContentDraftCategory.types"
import type ContentDraftQuestion from "@/types/content/ContentDraftQuestion.types"
import type ContentDraftState from "@/types/content/ContentDraftState.types"
import type ContentQuestionRowView from "@/types/content/ContentQuestionRowView.types"
import type ContentSnapshot from "@/types/content/ContentSnapshot.types"
import { questionFieldsChanged } from "@/utils/content/contentFieldDiff"
import { draftQuestionOf } from "@/utils/content/draft/deriveContentDraft"
import movedContentKeys from "@/utils/content/movedContentKeys"
import whatsappPages from "@/utils/content/whatsappPages"

function lastChangeOf(question: ContentDraftQuestion): ContentQuestionRowView["lastChange"] {
    if (question.id === null) {
        return null
    }

    if (question.updatedBy !== null && question.updatedAt !== null) {
        return { kind: "author", name: question.updatedBy.name, at: question.updatedAt }
    }

    return { kind: "initial" }
}

function rowOf(
    question: ContentDraftQuestion,
    category: ContentDraftCategory,
    position: number,
    saved: ContentDraftQuestion | undefined,
    moved: boolean,
    options: {
        pageBreak: number | null
        canMoveUp: boolean
        canMoveDown: boolean
        searching: boolean
        invalidKeys: ReadonlySet<string>
        itemErrors: Readonly<Record<string, string>>
    }
): ContentQuestionRowView {
    return {
        key: question.key,
        categoryKey: category.key,
        position,
        shortTitle: question.shortTitle,
        shortDescription: question.shortDescription,
        question: question.question,
        active: question.active,
        unsaved:
            saved === undefined ||
            moved ||
            questionFieldsChanged(question, saved) ||
            question.active !== saved.active,
        isNew: saved === undefined,
        invalid: options.invalidKeys.has(question.key),
        error: options.itemErrors[question.key] ?? null,
        requiresInPerson: question.requiresInPerson,
        outOfScope: question.outOfScope,
        legalBasis: question.legalBasis,
        documentsCount: question.requiredDocuments.length,
        lastChange: lastChangeOf(question),
        categoryTitle: options.searching ? category.shortTitle : null,
        pageBreak: options.pageBreak,
        canMoveUp: options.canMoveUp,
        canMoveDown: options.canMoveDown
    }
}

export default function buildQuestionRows(
    draft: ContentDraftState,
    snapshot: ContentSnapshot,
    entries: { question: ContentDraftQuestion; category: ContentDraftCategory }[],
    searching: boolean,
    invalidKeys: ReadonlySet<string>,
    itemErrors: Readonly<Record<string, string>>
): ContentQuestionRowView[] {
    const savedByCategory = new Map(
        Object.entries(snapshot.questionsByCategory).map(([categoryId, questions]) => [
            categoryId,
            new Map(questions.map((question) => [String(question.id), draftQuestionOf(question)]))
        ])
    )
    const pages = searching
        ? entries.map((entry) => ({ item: entry, pageBreak: null as number | null }))
        : whatsappPages(entries, (entry) => entry.question.active)

    const movedByCategory = new Map<string, Set<string>>()

    function movedIn(category: ContentDraftCategory): Set<string> {
        const cached = movedByCategory.get(category.key)

        if (cached) {
            return cached
        }

        const savedKeys = [...(savedByCategory.get(category.key)?.keys() ?? [])]
        const draftKeys = (draft.questionsByCategory[category.key] ?? []).map((item) => item.key)
        const moved = movedContentKeys(savedKeys, draftKeys)

        movedByCategory.set(category.key, moved)

        return moved
    }

    return pages.map(({ item: entry, pageBreak }, index) => {
        const saved = savedByCategory.get(entry.category.key)?.get(entry.question.key)
        const siblings = draft.questionsByCategory[entry.category.key] ?? []
        const siblingIndex = siblings.findIndex((question) => question.key === entry.question.key)

        return rowOf(
            entry.question,
            entry.category,
            index + 1,
            saved,
            movedIn(entry.category).has(entry.question.key),
            {
                pageBreak,
                canMoveUp: siblingIndex > 0,
                canMoveDown: siblingIndex >= 0 && siblingIndex < siblings.length - 1,
                searching,
                invalidKeys,
                itemErrors
            }
        )
    })
}
