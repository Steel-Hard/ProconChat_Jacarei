import { NextFunction, Request, Response, Router } from "express"
import DocumentsController from "../controllers/documents.controller"
import { requireAuth, requirePermission } from "../middleware/auth.middleware"
import { validateRequest } from "../middleware/validateRequest.middleware"
import { documentsBodySchema, previewBodySchema } from "../schemas/documents.schema"

export class DocumentsRoutes {
    private controller: DocumentsController
    private router: Router = Router()

    constructor(controller: DocumentsController = new DocumentsController()) {
        this.controller = controller

        this.router.use((_req: Request, res: Response, next: NextFunction) => {
            res.set("Cache-Control", "no-store")
            next()
        })

        this.router.use(requireAuth)
        this.router.use(requirePermission("documents.configure"))

        this.router.get("/", this.controller.get.bind(this.controller))
        this.router.put(
            "/",
            validateRequest({ body: documentsBodySchema }, { withIssues: true }),
            this.controller.save.bind(this.controller)
        )
        this.router.post(
            "/preview",
            validateRequest({ body: previewBodySchema }, { withIssues: true }),
            this.controller.preview.bind(this.controller)
        )
    }

    public getRouter(): Router {
        return this.router
    }
}

const documentsRoutes = new DocumentsRoutes().getRouter()
export default documentsRoutes
