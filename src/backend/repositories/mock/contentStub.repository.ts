import { IContentRepository } from "../content.repository.interface"
import { normalizeComparisonText } from "../content.repository"
import {
    CategoryCreateInput,
    CategoryRecord,
    CategoryUpdateInput,
    QuestionRecord,
    QuestionWriteInput,
} from "../../types/content.types"

interface StubCategoryState {
    id: number
    title: string
    shortTitle: string
    description: string | null
    active: boolean
    position: number
    updatedBy: { id: number; name: string } | null
    updatedAt: string
}

export class ContentStubRepository implements IContentRepository {
    private categories: StubCategoryState[]
    private questions: QuestionRecord[]
    private nextCategoryId: number
    private nextQuestionId: number

    constructor(
        initialCategories: CategoryRecord[] = [],
        initialQuestions: QuestionRecord[] = [],
    ) {
        this.categories = initialCategories.map((c: CategoryRecord) => ({
            id: c.id,
            title: c.title,
            shortTitle: c.shortTitle,
            description: c.description,
            active: c.active,
            position: c.position,
            updatedBy: c.updatedBy ? { ...c.updatedBy } : null,
            updatedAt: c.updatedAt,
        }))
        this.questions = initialQuestions.map((q: QuestionRecord) => ({
            ...q,
            requiredDocuments: [...q.requiredDocuments],
            updatedBy: q.updatedBy ? { ...q.updatedBy } : null,
        }))
        this.nextCategoryId =
            this.categories.reduce(
                (max: number, c: StubCategoryState) => Math.max(max, c.id),
                0,
            ) + 1
        this.nextQuestionId =
            this.questions.reduce((max: number, q: QuestionRecord) => Math.max(max, q.id), 0) + 1
    }

    private buildCategoryRecord(cat: StubCategoryState): CategoryRecord {
        const catQuestions = this.questions.filter((q: QuestionRecord) => q.categoryId === cat.id)
        const activeQuestions = catQuestions.filter((q: QuestionRecord) => q.active)
        return {
            id: cat.id,
            title: cat.title,
            shortTitle: cat.shortTitle,
            description: cat.description,
            active: cat.active,
            position: cat.position,
            questionsCount: catQuestions.length,
            activeQuestionsCount: activeQuestions.length,
            updatedBy: cat.updatedBy ? { ...cat.updatedBy } : null,
            updatedAt: cat.updatedAt,
        }
    }

    private cloneQuestion(q: QuestionRecord): QuestionRecord {
        const cat = this.categories.find((c: StubCategoryState) => c.id === q.categoryId)
        return {
            ...q,
            categoryTitle: cat?.title ?? q.categoryTitle,
            requiredDocuments: [...q.requiredDocuments],
            updatedBy: q.updatedBy ? { ...q.updatedBy } : null,
        }
    }

    public async listCategories(): Promise<CategoryRecord[]> {
        return [...this.categories]
            .sort((a: StubCategoryState, b: StubCategoryState) =>
                a.position !== b.position ? a.position - b.position : a.id - b.id,
            )
            .map((cat: StubCategoryState) => this.buildCategoryRecord(cat))
    }

    public async findCategoryById(id: number): Promise<CategoryRecord | null> {
        const cat = this.categories.find((c: StubCategoryState) => c.id === id)
        return cat ? this.buildCategoryRecord(cat) : null
    }

    public async existsCategoryWithNormalizedTitle(
        title: string,
        excludeCategoryId?: number,
    ): Promise<boolean> {
        const normalized = normalizeComparisonText(title)
        return this.categories.some(
            (c: StubCategoryState) =>
                c.id !== excludeCategoryId && normalizeComparisonText(c.title) === normalized,
        )
    }

    public async createCategory(
        input: CategoryCreateInput,
        actorUserId: number,
    ): Promise<CategoryRecord> {
        const maxPos = this.categories.reduce(
            (max: number, c: StubCategoryState) => Math.max(max, c.position),
            -1,
        )
        const created: StubCategoryState = {
            id: this.nextCategoryId++,
            title: input.title,
            shortTitle: input.shortTitle,
            description: input.description,
            active: true,
            position: maxPos + 1,
            updatedBy: { id: actorUserId, name: `Usuário ${actorUserId}` },
            updatedAt: new Date().toISOString(),
        }
        this.categories.push(created)
        return this.buildCategoryRecord(created)
    }

    public async updateCategory(
        id: number,
        input: CategoryUpdateInput,
        actorUserId: number,
    ): Promise<CategoryRecord | null> {
        const cat = this.categories.find((c: StubCategoryState) => c.id === id)
        if (!cat) {
            return null
        }
        cat.title = input.title
        cat.shortTitle = input.shortTitle
        cat.description = input.description
        if (input.active !== undefined) {
            cat.active = input.active
        }
        cat.updatedBy = { id: actorUserId, name: `Usuário ${actorUserId}` }
        cat.updatedAt = new Date().toISOString()
        return this.buildCategoryRecord(cat)
    }

    public async setCategoryActive(
        id: number,
        active: boolean,
        actorUserId: number,
    ): Promise<CategoryRecord | null> {
        const cat = this.categories.find((c: StubCategoryState) => c.id === id)
        if (!cat) {
            return null
        }
        cat.active = active
        cat.updatedBy = { id: actorUserId, name: `Usuário ${actorUserId}` }
        cat.updatedAt = new Date().toISOString()
        return this.buildCategoryRecord(cat)
    }

    public async reorderCategories(
        categoryIds: number[],
        actorUserId: number,
    ): Promise<CategoryRecord[]> {
        categoryIds.forEach((id: number, idx: number) => {
            const cat = this.categories.find((c: StubCategoryState) => c.id === id)
            if (cat && cat.position !== idx) {
                cat.position = idx
                cat.updatedBy = { id: actorUserId, name: `Usuário ${actorUserId}` }
                cat.updatedAt = new Date().toISOString()
            }
        })
        return this.listCategories()
    }

    public async listQuestionsByCategory(categoryId: number): Promise<QuestionRecord[]> {
        return this.questions
            .filter((q: QuestionRecord) => q.categoryId === categoryId)
            .sort((a: QuestionRecord, b: QuestionRecord) =>
                a.position !== b.position ? a.position - b.position : a.id - b.id,
            )
            .map((q: QuestionRecord) => this.cloneQuestion(q))
    }

    public async searchQuestions(searchTerm: string): Promise<QuestionRecord[]> {
        const normalizedTerm = normalizeComparisonText(searchTerm)
        const catOrder = new Map<number, number>()
        const sortedCats = await this.listCategories()
        sortedCats.forEach((c: CategoryRecord, idx: number) => catOrder.set(c.id, idx))

        return this.questions
            .filter(
                (q: QuestionRecord) =>
                    normalizeComparisonText(q.question).includes(normalizedTerm) ||
                    normalizeComparisonText(q.answer).includes(normalizedTerm) ||
                    normalizeComparisonText(q.shortTitle).includes(normalizedTerm),
            )
            .sort((a: QuestionRecord, b: QuestionRecord) => {
                const catA = catOrder.get(a.categoryId) ?? 0
                const catB = catOrder.get(b.categoryId) ?? 0
                if (catA !== catB) {
                    return catA - catB
                }
                return a.position !== b.position ? a.position - b.position : a.id - b.id
            })
            .map((q: QuestionRecord) => this.cloneQuestion(q))
    }

    public async findQuestionById(id: number): Promise<QuestionRecord | null> {
        const q = this.questions.find((item: QuestionRecord) => item.id === id)
        return q ? this.cloneQuestion(q) : null
    }

    public async createQuestion(
        input: QuestionWriteInput,
        actorUserId: number,
    ): Promise<QuestionRecord> {
        const cat = this.categories.find((c: StubCategoryState) => c.id === input.categoryId)
        const catQuestions = this.questions.filter(
            (q: QuestionRecord) => q.categoryId === input.categoryId,
        )
        const maxPos = catQuestions.reduce(
            (max: number, q: QuestionRecord) => Math.max(max, q.position),
            -1,
        )

        const created: QuestionRecord = {
            id: this.nextQuestionId++,
            categoryId: input.categoryId,
            categoryTitle: cat?.title ?? "",
            shortTitle: input.shortTitle,
            shortDescription: input.shortDescription,
            question: input.question,
            answer: input.answer,
            legalBasis: input.legalBasis,
            requiredDocuments: [...input.requiredDocuments],
            requiresInPerson: input.requiresInPerson,
            inPersonNote: input.inPersonNote,
            outOfScope: input.outOfScope,
            llmAllowed: input.llmAllowed,
            active: input.active,
            position: maxPos + 1,
            updatedBy: { id: actorUserId, name: `Usuário ${actorUserId}` },
            updatedAt: new Date().toISOString(),
        }
        this.questions.push(created)
        return this.cloneQuestion(created)
    }

    public async updateQuestion(
        id: number,
        input: QuestionWriteInput,
        actorUserId: number,
    ): Promise<QuestionRecord | null> {
        const q = this.questions.find((item: QuestionRecord) => item.id === id)
        if (!q) {
            return null
        }
        const cat = this.categories.find((c: StubCategoryState) => c.id === input.categoryId)
        q.categoryId = input.categoryId
        q.categoryTitle = cat?.title ?? q.categoryTitle
        q.shortTitle = input.shortTitle
        q.shortDescription = input.shortDescription
        q.question = input.question
        q.answer = input.answer
        q.legalBasis = input.legalBasis
        q.requiredDocuments = [...input.requiredDocuments]
        q.requiresInPerson = input.requiresInPerson
        q.inPersonNote = input.inPersonNote
        q.outOfScope = input.outOfScope
        q.llmAllowed = input.llmAllowed
        q.active = input.active
        q.updatedBy = { id: actorUserId, name: `Usuário ${actorUserId}` }
        q.updatedAt = new Date().toISOString()
        return this.cloneQuestion(q)
    }

    public async setQuestionActive(
        id: number,
        active: boolean,
        actorUserId: number,
    ): Promise<QuestionRecord | null> {
        const q = this.questions.find((item: QuestionRecord) => item.id === id)
        if (!q) {
            return null
        }
        q.active = active
        q.updatedBy = { id: actorUserId, name: `Usuário ${actorUserId}` }
        q.updatedAt = new Date().toISOString()
        return this.cloneQuestion(q)
    }

    public async reorderQuestions(
        categoryId: number,
        questionIds: number[],
        actorUserId: number,
    ): Promise<QuestionRecord[]> {
        questionIds.forEach((id: number, idx: number) => {
            const q = this.questions.find(
                (item: QuestionRecord) => item.id === id && item.categoryId === categoryId,
            )
            if (q && q.position !== idx) {
                q.position = idx
                q.updatedBy = { id: actorUserId, name: `Usuário ${actorUserId}` }
                q.updatedAt = new Date().toISOString()
            }
        })
        return this.listQuestionsByCategory(categoryId)
    }
}
