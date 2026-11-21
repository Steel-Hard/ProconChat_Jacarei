type ContentPreviewNextStepBubble = {
    type: "resolution" | "schedule_offer"
    text: string
    inPersonNote: string | null
    prompt: string
    buttons: string[]
    formattedText: string
}

export default ContentPreviewNextStepBubble
