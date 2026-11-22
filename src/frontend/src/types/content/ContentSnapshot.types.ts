import type ContentCategory from "@/types/content/ContentCategory.types"
import type ContentQuestion from "@/types/content/ContentQuestion.types"

type ContentSnapshot = {
    categories: ContentCategory[]
    questionsByCategory: Record<number, ContentQuestion[]>
}

export default ContentSnapshot
