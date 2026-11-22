import type ContentUpdatedBy from "@/types/content/ContentUpdatedBy.types"

type ContentDraftCategory = {
    key: string
    id: number | null
    title: string
    shortTitle: string
    description: string
    active: boolean
    updatedBy: ContentUpdatedBy | null
    updatedAt: string | null
}

export default ContentDraftCategory
