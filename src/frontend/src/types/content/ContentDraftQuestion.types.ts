import type ContentUpdatedBy from "@/types/content/ContentUpdatedBy.types"

type ContentDraftQuestion = {
    key: string
    id: number | null
    categoryKey: string
    shortTitle: string
    shortDescription: string
    question: string
    answer: string
    legalBasis: string
    requiredDocuments: string[]
    requiresInPerson: boolean
    inPersonNote: string
    outOfScope: boolean
    llmAllowed: boolean
    active: boolean
    updatedBy: ContentUpdatedBy | null
    updatedAt: string | null
}

export default ContentDraftQuestion
