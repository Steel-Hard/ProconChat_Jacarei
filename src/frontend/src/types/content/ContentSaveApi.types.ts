import type ContentCategoryInput from "@/types/content/ContentCategoryInput.types"
import type ContentQuestionInput from "@/types/content/ContentQuestionInput.types"

type ContentSaveApi = {
    createCategory: (input: ContentCategoryInput) => Promise<{ id: number }>
    updateCategory: (
        id: number,
        input: ContentCategoryInput & { active: boolean }
    ) => Promise<unknown>
    setCategoryActive: (id: number, active: boolean) => Promise<unknown>
    createQuestion: (categoryId: number, input: ContentQuestionInput) => Promise<{ id: number }>
    updateQuestion: (id: number, input: ContentQuestionInput) => Promise<unknown>
    setQuestionActive: (id: number, active: boolean) => Promise<unknown>
    reorderCategories: (ids: number[]) => Promise<unknown>
    reorderQuestions: (categoryId: number, ids: number[]) => Promise<unknown>
}

export default ContentSaveApi
