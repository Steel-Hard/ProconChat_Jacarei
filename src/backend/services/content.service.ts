import BadRequestError from "../errors/BadRequestError"
import ConflictError from "../errors/ConflictError"
import NotFoundError from "../errors/NotFoundError"
import contentRepository from "../repositories/content.repository"
import { IContentRepository } from "../repositories/content.repository.interface"
import { QuestionUpdateBody } from "../schemas/content.schema"
import {
    buildQuestionPreview,
    enrichCategoryItem,
    enrichCategoryList,
    enrichQuestionItem,
    enrichQuestionList,
} from "./contentRules"
import {
    CategoryCreateInput,
    CategoryItem,
    CategoryUpdateInput,
    QuestionItem,
    QuestionListQuery,
    QuestionPreviewInput,
    QuestionPreviewResult,
    QuestionWriteInput,
} from "../types/content.types"

export interface IContentService {
    listCategories(): Promise<CategoryItem[]>
    createCategory(input: CategoryCreateInput, actorUserId: number): Promise<CategoryItem>
    updateCategory(
        id: number,
        input: CategoryUpdateInput,
        actorUserId: number,
    ): Promise<CategoryItem>
    setCategoryActive(id: number, active: boolean, actorUserId: number): Promise<CategoryItem>
    reorderCategories(categoryIds: number[], actorUserId: number): Promise<CategoryItem[]>
    listQuestions(query: QuestionListQuery): Promise<QuestionItem[]>
    createQuestion(input: QuestionWriteInput, actorUserId: number): Promise<QuestionItem>
    updateQuestion(
        id: number,
        input: QuestionUpdateBody,
        actorUserId: number,
    ): Promise<QuestionItem>
    setQuestionActive(id: number, active: boolean, actorUserId: number): Promise<QuestionItem>
    reorderQuestions(
        categoryId: number,
        questionIds: number[],
        actorUserId: number,
    ): Promise<QuestionItem[]>
    previewQuestion(input: QuestionPreviewInput): Promise<QuestionPreviewResult>
}

interface ContentServiceDependencies {
    repository?: IContentRepository
}

export class ContentService implements IContentService {
    private repository: IContentRepository

    constructor({ repository = contentRepository }: ContentServiceDependencies = {}) {
        this.repository = repository
    }

    public async listCategories(): Promise<CategoryItem[]> {
        const categories = await this.repository.listCategories()
        return enrichCategoryList(categories)
    }

    public async createCategory(
        input: CategoryCreateInput,
        actorUserId: number,
    ): Promise<CategoryItem> {
        const duplicate = await this.repository.existsCategoryWithNormalizedTitle(input.title)
        if (duplicate) {
            throw new ConflictError(
                "Já existe uma categoria com este título",
                "CATEGORY_TITLE_CONFLICT",
            )
        }

        const created = await this.repository.createCategory(input, actorUserId)
        const allCategories = await this.listCategories()
        return (
            allCategories.find((cat: CategoryItem) => cat.id === created.id) ??
            enrichCategoryItem(created)
        )
    }

    public async updateCategory(
        id: number,
        input: CategoryUpdateInput,
        actorUserId: number,
    ): Promise<CategoryItem> {
        const existing = await this.repository.findCategoryById(id)
        if (!existing) {
            throw new NotFoundError("Categoria não encontrada")
        }

        const duplicate = await this.repository.existsCategoryWithNormalizedTitle(input.title, id)
        if (duplicate) {
            throw new ConflictError(
                "Já existe uma categoria com este título",
                "CATEGORY_TITLE_CONFLICT",
            )
        }

        const updated = await this.repository.updateCategory(id, input, actorUserId)
        if (!updated) {
            throw new NotFoundError("Categoria não encontrada")
        }

        const allCategories = await this.listCategories()
        return (
            allCategories.find((cat: CategoryItem) => cat.id === id) ?? enrichCategoryItem(updated)
        )
    }

    public async setCategoryActive(
        id: number,
        active: boolean,
        actorUserId: number,
    ): Promise<CategoryItem> {
        const updated = await this.repository.setCategoryActive(id, active, actorUserId)
        if (!updated) {
            throw new NotFoundError("Categoria não encontrada")
        }

        const allCategories = await this.listCategories()
        return (
            allCategories.find((cat: CategoryItem) => cat.id === id) ?? enrichCategoryItem(updated)
        )
    }

    public async reorderCategories(
        categoryIds: number[],
        actorUserId: number,
    ): Promise<CategoryItem[]> {
        const existing = await this.repository.listCategories()
        const existingIds = new Set(existing.map((c) => c.id))

        if (
            categoryIds.length !== existing.length ||
            categoryIds.some((id: number) => !existingIds.has(id))
        ) {
            throw new BadRequestError(
                "A lista de categorias para reordenação deve conter todas as categorias cadastradas",
            )
        }

        const reordered = await this.repository.reorderCategories(categoryIds, actorUserId)
        return enrichCategoryList(reordered)
    }

    public async listQuestions(query: QuestionListQuery): Promise<QuestionItem[]> {
        if (query.search !== undefined) {
            const found = await this.repository.searchQuestions(query.search)
            return enrichQuestionList(found, { isSearchResult: true })
        }

        if (query.categoryId === undefined) {
            throw new BadRequestError("Informe a categoria ou um termo de busca")
        }

        const category = await this.repository.findCategoryById(query.categoryId)
        if (!category) {
            throw new NotFoundError("Categoria não encontrada")
        }

        const questions = await this.repository.listQuestionsByCategory(query.categoryId)
        return enrichQuestionList(questions)
    }

    public async createQuestion(
        input: QuestionWriteInput,
        actorUserId: number,
    ): Promise<QuestionItem> {
        const category = await this.repository.findCategoryById(input.categoryId)
        if (!category) {
            throw new NotFoundError("Categoria não encontrada")
        }

        const created = await this.repository.createQuestion(input, actorUserId)
        const categoryQuestions = await this.repository.listQuestionsByCategory(input.categoryId)
        const enriched = enrichQuestionList(categoryQuestions)
        return (
            enriched.find((q: QuestionItem) => q.id === created.id) ?? enrichQuestionItem(created)
        )
    }

    public async updateQuestion(
        id: number,
        input: QuestionUpdateBody,
        actorUserId: number,
    ): Promise<QuestionItem> {
        const existing = await this.repository.findQuestionById(id)
        if (!existing) {
            throw new NotFoundError("Pergunta não encontrada")
        }

        const targetCategoryId = input.categoryId ?? existing.categoryId
        const category = await this.repository.findCategoryById(targetCategoryId)
        if (!category) {
            throw new NotFoundError("Categoria não encontrada")
        }

        const writeInput: QuestionWriteInput = {
            categoryId: targetCategoryId,
            shortTitle: input.shortTitle,
            shortDescription: input.shortDescription,
            question: input.question,
            answer: input.answer,
            legalBasis: input.legalBasis,
            requiredDocuments: input.requiredDocuments,
            requiresInPerson: input.requiresInPerson,
            inPersonNote: input.inPersonNote,
            outOfScope: input.outOfScope,
            llmAllowed: input.llmAllowed,
            active: input.active ?? existing.active,
        }

        const updated = await this.repository.updateQuestion(id, writeInput, actorUserId)
        if (!updated) {
            throw new NotFoundError("Pergunta não encontrada")
        }

        const categoryQuestions = await this.repository.listQuestionsByCategory(targetCategoryId)
        const enriched = enrichQuestionList(categoryQuestions)
        return enriched.find((q: QuestionItem) => q.id === id) ?? enrichQuestionItem(updated)
    }

    public async setQuestionActive(
        id: number,
        active: boolean,
        actorUserId: number,
    ): Promise<QuestionItem> {
        const updated = await this.repository.setQuestionActive(id, active, actorUserId)
        if (!updated) {
            throw new NotFoundError("Pergunta não encontrada")
        }

        const categoryQuestions = await this.repository.listQuestionsByCategory(updated.categoryId)
        const enriched = enrichQuestionList(categoryQuestions)
        return enriched.find((q: QuestionItem) => q.id === id) ?? enrichQuestionItem(updated)
    }

    public async reorderQuestions(
        categoryId: number,
        questionIds: number[],
        actorUserId: number,
    ): Promise<QuestionItem[]> {
        const category = await this.repository.findCategoryById(categoryId)
        if (!category) {
            throw new NotFoundError("Categoria não encontrada")
        }

        const existing = await this.repository.listQuestionsByCategory(categoryId)
        const existingIds = new Set(existing.map((q) => q.id))

        if (
            questionIds.length !== existing.length ||
            questionIds.some((id: number) => !existingIds.has(id))
        ) {
            throw new BadRequestError(
                "A lista de perguntas para reordenação deve conter todas as perguntas da categoria",
            )
        }

        const reordered = await this.repository.reorderQuestions(
            categoryId,
            questionIds,
            actorUserId,
        )
        return enrichQuestionList(reordered)
    }

    public async previewQuestion(input: QuestionPreviewInput): Promise<QuestionPreviewResult> {
        const category = await this.repository.findCategoryById(input.categoryId)
        if (!category) {
            throw new NotFoundError("Categoria não encontrada")
        }

        const existingQuestions = await this.repository.listQuestionsByCategory(input.categoryId)
        return buildQuestionPreview(category, existingQuestions, input)
    }
}

export const contentService = new ContentService()
export default contentService
