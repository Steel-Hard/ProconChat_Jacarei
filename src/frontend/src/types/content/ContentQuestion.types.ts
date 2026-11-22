import type ContentUpdatedBy from "@/types/content/ContentUpdatedBy.types"

type ContentQuestion = {
    id: number
    categoryId: number
    categoryTitle: string
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
    position: number
    updatedBy: ContentUpdatedBy | null
    updatedAt: string
    whatsappPage: number | null
    pageBreak: string | null
    answerLengthWarning: boolean
    answerLengthWarningMessage: string | null
}

export default ContentQuestion
