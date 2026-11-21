import type ContentPreviewBubbleModel from "@/types/content/ContentPreviewBubbleModel.types"
import type ContentPreviewListSection from "@/types/content/ContentPreviewListSection.types"

type ContentPreviewModel = {
    list: ContentPreviewListSection
    notice: string | null
    primaryBubbles: ContentPreviewBubbleModel[]
    fallbackBubbles: ContentPreviewBubbleModel[]
}

export default ContentPreviewModel
