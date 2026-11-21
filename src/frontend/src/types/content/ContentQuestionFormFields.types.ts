import type ContentDraftQuestion from "@/types/content/ContentDraftQuestion.types"

type ContentQuestionFormFields = Omit<
    ContentDraftQuestion,
    "key" | "id" | "categoryKey" | "updatedBy" | "updatedAt"
>

export default ContentQuestionFormFields
