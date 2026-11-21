type ContentPreviewAnswerBubble = {
    question: string
    answer: string
    legalBasis: string | null
    requiredDocuments: string[]
    llmAllowed: boolean
    aiSampleLabel: string | null
    aiSampleText: string | null
    outOfScopeNotice: string | null
    disclaimer: string
    formattedText: string
}

export default ContentPreviewAnswerBubble
