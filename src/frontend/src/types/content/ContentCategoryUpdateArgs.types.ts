import type ContentCategoryInput from "@/types/content/ContentCategoryInput.types"

type ContentCategoryUpdateArgs = {
    id: number
    body: ContentCategoryInput & { active?: boolean }
}

export default ContentCategoryUpdateArgs
