import type ContentPreviewBubbleModel from "@/types/content/ContentPreviewBubbleModel.types"
import type ContentPreviewListModel from "@/types/content/ContentPreviewListModel.types"

type ContentPreviewModel = {
    list: ContentPreviewListModel
    primaryBubbles: ContentPreviewBubbleModel[]
    fallbackBubbles: ContentPreviewBubbleModel[]
}

export default ContentPreviewModel
