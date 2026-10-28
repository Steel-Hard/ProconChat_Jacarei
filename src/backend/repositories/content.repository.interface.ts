import {
    CategoryCreateInput,
    CategoryRecord,
    CategoryUpdateInput,
    QuestionRecord,
    QuestionWriteInput,
} from "../types/content.types"

export interface IContentRepository {
    listCategories(): Promise<CategoryRecord[]>
    findCategoryById(id: number): Promise<CategoryRecord | null>
    existsCategoryWithNormalizedTitle(
        title: string,
        excludeCategoryId?: number,
    ): Promise<boolean>
    createCategory(input: CategoryCreateInput, actorUserId: number): Promise<CategoryRecord>
    updateCategory(
        id: number,
        input: CategoryUpdateInput,
        actorUserId: number,
    ): Promise<CategoryRecord | null>
    setCategoryActive(
        id: number,
        active: boolean,
        actorUserId: number,
    ): Promise<CategoryRecord | null>
    reorderCategories(categoryIds: number[], actorUserId: number): Promise<CategoryRecord[]>
    listQuestionsByCategory(categoryId: number): Promise<QuestionRecord[]>
    searchQuestions(searchTerm: string): Promise<QuestionRecord[]>
    findQuestionById(id: number): Promise<QuestionRecord | null>
    createQuestion(input: QuestionWriteInput, actorUserId: number): Promise<QuestionRecord>
    updateQuestion(
        id: number,
        input: QuestionWriteInput,
        actorUserId: number,
    ): Promise<QuestionRecord | null>
    setQuestionActive(
        id: number,
        active: boolean,
        actorUserId: number,
    ): Promise<QuestionRecord | null>
    reorderQuestions(
        categoryId: number,
        questionIds: number[],
        actorUserId: number,
    ): Promise<QuestionRecord[]>
}
