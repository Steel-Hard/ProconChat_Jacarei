import type { OutgoingMessage } from "./message.types"

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

export interface PreviewListRowInput {
    questionId: number | null
    shortTitle: string
    shortDescription: string | null
    isCurrent: boolean
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
    listRows?: PreviewListRowInput[]
}

export interface PreviewBotList {
    message: Extract<OutgoingMessage, { type: "list" }>
    currentRowIndex: number
    page: number
    totalPages: number
}

export interface PreviewAiLengthWarning {
    exceedsLimit: boolean
    length: number
    limit: number
    message: string | null
}

export interface PreviewBotMessages {
    categoryList: PreviewBotList
    officialMessages: OutgoingMessage[]
    aiMessage: Extract<OutgoingMessage, { type: "buttons" }> | null
    aiLengthWarning: PreviewAiLengthWarning
}

export interface QuestionPreviewResult {
    answerLengthWarning: boolean
    answerLengthWarningMessage: string | null
    botMessages: PreviewBotMessages
}
