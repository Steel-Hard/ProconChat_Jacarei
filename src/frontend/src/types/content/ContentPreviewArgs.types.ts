import type ContentQuestionInput from "@/types/content/ContentQuestionInput.types"

type ContentPreviewArgs = Omit<ContentQuestionInput, "active"> & {
    questionId?: number
    categoryId: number
}

export default ContentPreviewArgs
