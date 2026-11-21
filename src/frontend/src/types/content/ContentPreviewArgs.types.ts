import type ContentPreviewListRowInput from "@/types/content/ContentPreviewListRowInput.types"
import type ContentQuestionInput from "@/types/content/ContentQuestionInput.types"

type ContentPreviewArgs = Omit<ContentQuestionInput, "active"> & {
    questionId?: number
    categoryId: number
    listRows: ContentPreviewListRowInput[]
}

export default ContentPreviewArgs
