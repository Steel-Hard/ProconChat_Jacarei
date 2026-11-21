import type ContentPreviewModel from "@/types/content/ContentPreviewModel.types"

type ContentPreviewProps = {
    status: "ready" | "updating" | "loading" | "error" | "invalid" | "unsaved"
    model: ContentPreviewModel | null
    onClose: () => void
    onRetry: () => void
}

export default ContentPreviewProps
