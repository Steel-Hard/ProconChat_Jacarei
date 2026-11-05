import { NextFunction, Request, Response } from "express"
import UnauthorizedError from "../errors/UnauthorizedError"
import { QuestionUpdateBody } from "../schemas/content.schema"
import { IContentService, contentService } from "../services/content.service"
import {
    CategoryActiveInput,
    CategoryCreateInput,
    CategoryReorderInput,
    CategoryUpdateInput,
    QuestionActiveInput,
    QuestionListQuery,
    QuestionPreviewInput,
    QuestionReorderInput,
    QuestionWriteInput,
} from "../types/content.types"

interface ContentControllerDependencies {
    service?: IContentService
}

class ContentController {
    private service: IContentService

    constructor({ service = contentService }: ContentControllerDependencies = {}) {
        this.service = service
    }

    public async listCategories(
        _req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            const categories = await this.service.listCategories()
            res.status(200).json({ data: categories })
        } catch (error) {
            next(error)
        }
    }

    public async createCategory(
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            const actorUserId = this.userId(req)
            const created = await this.service.createCategory(
                req.body as CategoryCreateInput,
                actorUserId,
            )
            res.status(201).json({ data: created })
        } catch (error) {
            next(error)
        }
    }

    public async updateCategory(
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            const actorUserId = this.userId(req)
            const id = Number(req.params.id)
            const updated = await this.service.updateCategory(
                id,
                req.body as CategoryUpdateInput,
                actorUserId,
            )
            res.status(200).json({ data: updated })
        } catch (error) {
            next(error)
        }
    }

    public async setCategoryActive(
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            const actorUserId = this.userId(req)
            const id = Number(req.params.id)
            const { active } = req.body as CategoryActiveInput
            const updated = await this.service.setCategoryActive(id, active, actorUserId)
            res.status(200).json({ data: updated })
        } catch (error) {
            next(error)
        }
    }

    public async reorderCategories(
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            const actorUserId = this.userId(req)
            const { categoryIds } = req.body as CategoryReorderInput
            const reordered = await this.service.reorderCategories(categoryIds, actorUserId)
            res.status(200).json({ data: reordered })
        } catch (error) {
            next(error)
        }
    }

    public async listQuestions(
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            const query = req.query as unknown as QuestionListQuery
            const questions = await this.service.listQuestions(query)
            res.status(200).json({ data: questions })
        } catch (error) {
            next(error)
        }
    }

    public async listQuestionsByCategory(
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            const categoryId = Number(req.params.id)
            const questions = await this.service.listQuestions({ categoryId })
            res.status(200).json({ data: questions })
        } catch (error) {
            next(error)
        }
    }

    public async createQuestion(
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            const actorUserId = this.userId(req)
            const created = await this.service.createQuestion(
                req.body as QuestionWriteInput,
                actorUserId,
            )
            res.status(201).json({ data: created })
        } catch (error) {
            next(error)
        }
    }

    public async updateQuestion(
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            const actorUserId = this.userId(req)
            const id = Number(req.params.id)
            const updated = await this.service.updateQuestion(
                id,
                req.body as QuestionUpdateBody,
                actorUserId,
            )
            res.status(200).json({ data: updated })
        } catch (error) {
            next(error)
        }
    }

    public async setQuestionActive(
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            const actorUserId = this.userId(req)
            const id = Number(req.params.id)
            const { active } = req.body as QuestionActiveInput
            const updated = await this.service.setQuestionActive(id, active, actorUserId)
            res.status(200).json({ data: updated })
        } catch (error) {
            next(error)
        }
    }

    public async reorderQuestions(
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            const actorUserId = this.userId(req)
            const categoryId = Number(req.params.id)
            const { questionIds } = req.body as QuestionReorderInput
            const reordered = await this.service.reorderQuestions(
                categoryId,
                questionIds,
                actorUserId,
            )
            res.status(200).json({ data: reordered })
        } catch (error) {
            next(error)
        }
    }

    public async previewQuestion(
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            const preview = await this.service.previewQuestion(req.body as QuestionPreviewInput)
            res.status(200).json({ data: preview })
        } catch (error) {
            next(error)
        }
    }

    private userId(req: Request): number {
        if (!req.authUser) {
            throw new UnauthorizedError("Authentication required")
        }
        return req.authUser.id
    }
}

export default ContentController
