import type ContentPreviewBubbleModel from "@/types/content/ContentPreviewBubbleModel.types"
import type ContentPreviewModel from "@/types/content/ContentPreviewModel.types"
import type ContentPreviewOutgoingMessage from "@/types/content/ContentPreviewOutgoingMessage.types"
import type ContentPreviewResult from "@/types/content/ContentPreviewResult.types"

function bubbleOf(message: ContentPreviewOutgoingMessage, id: string): ContentPreviewBubbleModel {
    if (message.type === "buttons") {
        return {
            id,
            text: message.text,
            footerLabel: message.footer ?? null,
            buttons: message.buttons.map((button) => button.title)
        }
    }

    return { id, text: message.text, footerLabel: null, buttons: [] }
}

export default function buildPreviewModel(result: ContentPreviewResult): ContentPreviewModel {
    const { categoryList, officialMessages, aiMessage, aiLengthWarning } = result.botMessages
    const official = officialMessages.map((message, index) =>
        bubbleOf(message, `official-${index}`)
    )

    return {
        list: {
            text: categoryList.message.text,
            buttonText: categoryList.message.buttonText,
            rows: categoryList.message.rows.map((row, index) => ({
                key: row.id,
                title: row.title,
                description: row.description ?? null,
                isCurrent: index === categoryList.currentRowIndex
            }))
        },
        primaryBubbles: aiMessage ? [bubbleOf(aiMessage, "ai")] : official,
        fallbackBubbles: aiMessage ? official : [],
        lengthWarning: aiLengthWarning.exceedsLimit ? aiLengthWarning.message : null
    }
}
