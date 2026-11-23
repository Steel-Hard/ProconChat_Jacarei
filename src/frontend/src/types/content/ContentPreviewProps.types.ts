import type MisspelledPlaceholder from "@/types/content/MisspelledPlaceholder.types"
import type ContentPreviewModel from "@/types/content/ContentPreviewModel.types"

type ContentPreviewProps = {
    status: "ready" | "updating" | "loading" | "error" | "invalid" | "unsaved"
    model: ContentPreviewModel | null
    misspelledPlaceholders?: MisspelledPlaceholder[]
    onClose: () => void
    onRetry: () => void
}

export default ContentPreviewProps
