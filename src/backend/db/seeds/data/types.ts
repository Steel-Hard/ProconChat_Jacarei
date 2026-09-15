export interface FaqQuestionSeed {
    question: string
    legalBasis: string | null
    answer: string
    requiresInPerson: boolean
    outOfScope?: boolean
    requiredDocuments: string[]
}

export interface FaqCategorySeed {
    title: string
    description: string
    questions: FaqQuestionSeed[]
}
