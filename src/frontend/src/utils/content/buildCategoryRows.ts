import type ContentCategoryRowView from "@/types/content/ContentCategoryRowView.types"
import type ContentDraftState from "@/types/content/ContentDraftState.types"
import type ContentSnapshot from "@/types/content/ContentSnapshot.types"
import {
    categoryCountsOf,
    isCategoryHiddenInChatbot,
    isCategoryVisibleInChatbot
} from "@/utils/content/categoryVisibility"
import { categoryFieldsChanged } from "@/utils/content/contentFieldDiff"
import { draftCategoryOf } from "@/utils/content/draft/deriveContentDraft"
import whatsappPages from "@/utils/content/whatsappPages"

export default function buildCategoryRows(
    draft: ContentDraftState,
    snapshot: ContentSnapshot,
    selectedKey: string | null,
    invalidKeys: ReadonlySet<string>
): ContentCategoryRowView[] {
    const saved = new Map(
        snapshot.categories.map((category) => [String(category.id), draftCategoryOf(category)])
    )
    const pages = whatsappPages(draft.categories, (category) =>
        isCategoryVisibleInChatbot(category, draft.questionsByCategory[category.key] ?? [])
    )

    return pages.map(({ item: category, pageBreak }, index) => {
        const questions = draft.questionsByCategory[category.key] ?? []
        const counts = categoryCountsOf(questions)
        const savedCategory = saved.get(category.key)
        const state = !category.active
            ? "inactive"
            : isCategoryHiddenInChatbot(category, questions)
              ? "hidden"
              : "active"

        return {
            key: category.key,
            position: index + 1,
            shortTitle: category.shortTitle,
            title: category.title,
            ...counts,
            state,
            unsaved:
                savedCategory === undefined ||
                categoryFieldsChanged(category, savedCategory) ||
                category.active !== savedCategory.active,
            invalid: invalidKeys.has(category.key),
            selected: category.key === selectedKey,
            pageBreak,
            canMoveUp: index > 0,
            canMoveDown: index < draft.categories.length - 1
        }
    })
}
