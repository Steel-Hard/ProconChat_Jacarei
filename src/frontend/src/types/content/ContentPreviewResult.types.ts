import type ContentPreviewAnswerBubble from "@/types/content/ContentPreviewAnswerBubble.types"
import type ContentPreviewListSection from "@/types/content/ContentPreviewListSection.types"
import type ContentPreviewNextStepBubble from "@/types/content/ContentPreviewNextStepBubble.types"

type ContentPreviewResult = {
    fixedDisclaimer: string
    answerLengthWarning: boolean
    answerLengthWarningMessage: string | null
    categoryList: ContentPreviewListSection
    answerBubble: ContentPreviewAnswerBubble
    nextStepBubble: ContentPreviewNextStepBubble | null
}

export default ContentPreviewResult
