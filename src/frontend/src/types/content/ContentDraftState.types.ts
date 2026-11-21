import type ContentDraftCategory from "@/types/content/ContentDraftCategory.types"
import type ContentDraftQuestion from "@/types/content/ContentDraftQuestion.types"

type ContentDraftState = {
    categories: ContentDraftCategory[]
    questionsByCategory: Record<string, ContentDraftQuestion[]>
    nextNewKey: number
}

export default ContentDraftState
