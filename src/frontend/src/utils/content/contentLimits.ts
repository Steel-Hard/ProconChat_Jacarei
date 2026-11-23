const CONTENT_LIMITS = {
    categoryTitle: 150,
    shortTitle: 24,
    shortDescription: 72,
    categoryDescription: 500,
    question: 500,
    answer: 3000,
    answerWarningFrom: 1000,
    legalBasis: 500,
    inPersonNote: 500,
    document: 255,
    documentsCount: 30
} as const

export default CONTENT_LIMITS
