import type ContentUpdatedBy from "@/types/content/ContentUpdatedBy.types"

type ContentCategory = {
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
    hiddenInChatbot: boolean
    whatsappPage: number | null
    pageBreak: string | null
}

export default ContentCategory
