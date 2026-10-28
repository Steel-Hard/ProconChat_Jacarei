import { NextFunction, Request, RequestHandler, Response, Router } from "express"
import ContentController from "../controllers/content.controller"
import { requireAuth, requirePermission } from "../middleware/auth.middleware"
import { validateRequest } from "../middleware/validateRequest.middleware"
import {
    categoryActiveBodySchema,
    categoryCreateBodySchema,
    categoryReorderBodySchema,
    categoryUpdateBodySchema,
    contentIdParamSchema,
    questionActiveBodySchema,
    questionCreateBodySchema,
    questionListQuerySchema,
    questionPreviewBodySchema,
    questionReorderBodySchema,
    questionUpdateBodySchema,
} from "../schemas/content.schema"
import {
    IContentService,
    contentService as defaultContentService,
} from "../services/content.service"

interface ContentRoutesDependencies {
    service?: IContentService
    authMiddleware?: RequestHandler
}

export class ContentRoutes {
    private router: Router = Router()

    constructor({
        service = defaultContentService,
        authMiddleware = requireAuth,
    }: ContentRoutesDependencies = {}) {
        const controller = new ContentController({ service })

        this.router.use((_req: Request, res: Response, next: NextFunction) => {
            res.set("Cache-Control", "no-store")
            next()
        })
        this.router.use(authMiddleware, requirePermission("content.manage"))

        this.router.get("/categories", controller.listCategories.bind(controller))
        this.router.post(
            "/categories",
            validateRequest({ body: categoryCreateBodySchema }, { withIssues: true }),
            controller.createCategory.bind(controller),
        )
        this.router.put(
            "/categories/reorder",
            validateRequest({ body: categoryReorderBodySchema }, { withIssues: true }),
            controller.reorderCategories.bind(controller),
        )
        this.router.put(
            "/categories/:id",
            validateRequest(
                {
                    params: contentIdParamSchema,
                    body: categoryUpdateBodySchema,
                },
                { withIssues: true },
            ),
            controller.updateCategory.bind(controller),
        )
        this.router.patch(
            "/categories/:id/active",
            validateRequest(
                {
                    params: contentIdParamSchema,
                    body: categoryActiveBodySchema,
                },
                { withIssues: true },
            ),
            controller.setCategoryActive.bind(controller),
        )
        this.router.get(
            "/categories/:id/questions",
            validateRequest({ params: contentIdParamSchema }, { withIssues: true }),
            controller.listQuestionsByCategory.bind(controller),
        )
        this.router.put(
            "/categories/:id/questions/reorder",
            validateRequest(
                {
                    params: contentIdParamSchema,
                    body: questionReorderBodySchema,
                },
                { withIssues: true },
            ),
            controller.reorderQuestions.bind(controller),
        )

        this.router.get(
            "/questions",
            validateRequest({ query: questionListQuerySchema }, { withIssues: true }),
            controller.listQuestions.bind(controller),
        )
        this.router.post(
            "/questions",
            validateRequest({ body: questionCreateBodySchema }, { withIssues: true }),
            controller.createQuestion.bind(controller),
        )
        this.router.post(
            "/questions/preview",
            validateRequest({ body: questionPreviewBodySchema }, { withIssues: true }),
            controller.previewQuestion.bind(controller),
        )
        this.router.post(
            "/preview",
            validateRequest({ body: questionPreviewBodySchema }, { withIssues: true }),
            controller.previewQuestion.bind(controller),
        )
        this.router.put(
            "/questions/:id",
            validateRequest(
                {
                    params: contentIdParamSchema,
                    body: questionUpdateBodySchema,
                },
                { withIssues: true },
            ),
            controller.updateQuestion.bind(controller),
        )
        this.router.patch(
            "/questions/:id/active",
            validateRequest(
                {
                    params: contentIdParamSchema,
                    body: questionActiveBodySchema,
                },
                { withIssues: true },
            ),
            controller.setQuestionActive.bind(controller),
        )
    }

    public getRouter(): Router {
        return this.router
    }
}

const contentRoutes = new ContentRoutes().getRouter()
export default contentRoutes
