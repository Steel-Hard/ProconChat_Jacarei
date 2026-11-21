import type ContentPreviewOutgoingMessage from "@/types/content/ContentPreviewOutgoingMessage.types"

type ContentPreviewBotMessages = {
    categoryList: {
        message: Extract<ContentPreviewOutgoingMessage, { type: "list" }>
        currentRowIndex: number
        page: number
        totalPages: number
    }
    officialMessages: ContentPreviewOutgoingMessage[]
    aiMessage: Extract<ContentPreviewOutgoingMessage, { type: "buttons" }> | null
    aiLengthWarning: {
        exceedsLimit: boolean
        length: number
        limit: number
        message: string | null
    }
}

export default ContentPreviewBotMessages
