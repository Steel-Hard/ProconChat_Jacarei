type ContentQuestionInput = {
    shortTitle: string
    shortDescription: string | null
    question: string
    answer: string
    legalBasis: string | null
    requiredDocuments: string[]
    requiresInPerson: boolean
    inPersonNote: string | null
    outOfScope: boolean
    llmAllowed: boolean
    active: boolean
}

export default ContentQuestionInput
