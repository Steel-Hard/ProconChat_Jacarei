import type ContentDraftCategory from "@/types/content/ContentDraftCategory.types"
import type ContentDraftQuestion from "@/types/content/ContentDraftQuestion.types"

type ContentSearchResult = {
    question: ContentDraftQuestion
    category: ContentDraftCategory
}

export default ContentSearchResult
