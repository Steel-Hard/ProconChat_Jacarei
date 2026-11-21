import type ContentPreviewModel from "@/types/content/ContentPreviewModel.types"
import type ContentPreviewProps from "@/types/content/ContentPreviewProps.types"

type ContentPreviewState = {
    status: ContentPreviewProps["status"]
    model: ContentPreviewModel | null
}

export default ContentPreviewState
