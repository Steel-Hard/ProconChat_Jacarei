import type ContentPreviewListRow from "@/types/content/ContentPreviewListRow.types"

type ContentPreviewListSection = {
    categoryTitle: string
    categoryShortTitle: string
    rows: ContentPreviewListRow[]
    hasMoreOptions: boolean
    totalActiveQuestions: number
}

export default ContentPreviewListSection
