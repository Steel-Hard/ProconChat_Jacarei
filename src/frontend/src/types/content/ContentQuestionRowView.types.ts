type ContentQuestionRowView = {
    key: string
    categoryKey: string
    position: number
    shortTitle: string
    shortDescription: string
    question: string
    active: boolean
    unsaved: boolean
    invalid: boolean
    error: string | null
    requiresInPerson: boolean
    outOfScope: boolean
    legalBasis: string
    documentsCount: number
    lastChange: { kind: "author"; name: string; at: string } | { kind: "initial" } | null
    categoryTitle: string | null
    pageBreak: number | null
    canMoveUp: boolean
    canMoveDown: boolean
}

export default ContentQuestionRowView
