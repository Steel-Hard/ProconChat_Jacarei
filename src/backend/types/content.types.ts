export interface ContentUpdatedBy {
    id: number
    name: string
}

export interface CategoryRecord {
    id: number
    title: string
    shortTitle: string
    description: string | null
    active: boolean
    position: number
    questionsCount: number
    activeQuestionsCount: number
    updatedBy: ContentUpdatedBy | null
    updatedAt: string
}

export interface CategoryItem extends CategoryRecord {
    hiddenInChatbot: boolean
    whatsappPage: number | null
    pageBreak: string | null
}

export interface QuestionRecord {
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
}

export interface QuestionItem extends QuestionRecord {
    whatsappPage: number | null
    pageBreak: string | null
    answerLengthWarning: boolean
    answerLengthWarningMessage: string | null
}

export interface CategoryCreateInput {
    title: string
    shortTitle: string
    description: string | null
}

export interface CategoryUpdateInput {
    title: string
    shortTitle: string
    description: string | null
    active?: boolean
}

export interface CategoryActiveInput {
    active: boolean
}

export interface CategoryReorderInput {
    categoryIds: number[]
}

export interface QuestionListQuery {
    categoryId?: number
    search?: string
}

export interface QuestionWriteInput {
    categoryId: number
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

export interface QuestionActiveInput {
    active: boolean
}

export interface QuestionReorderInput {
    questionIds: number[]
}

export interface QuestionPreviewInput {
    questionId?: number
    categoryId: number
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
}

export interface PreviewCategoryListRow {
    id: number | null
    shortTitle: string
    shortDescription: string | null
    isCurrent: boolean
}

export interface PreviewCategoryListSection {
    categoryTitle: string
    categoryShortTitle: string
    rows: PreviewCategoryListRow[]
    hasMoreOptions: boolean
    totalActiveQuestions: number
}

export interface PreviewAnswerBubble {
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

export type PreviewNextStepType = "resolution" | "schedule_offer"

export interface PreviewNextStepBubble {
    type: PreviewNextStepType
    text: string
    inPersonNote: string | null
    prompt: string
    buttons: string[]
    formattedText: string
}

export interface QuestionPreviewResult {
    fixedDisclaimer: string
    answerLengthWarning: boolean
    answerLengthWarningMessage: string | null
    categoryList: PreviewCategoryListSection
    answerBubble: PreviewAnswerBubble
    nextStepBubble: PreviewNextStepBubble | null
}
