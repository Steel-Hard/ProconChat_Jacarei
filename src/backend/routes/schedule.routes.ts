import { NextFunction, Request, RequestHandler, Response, Router } from "express"
import ScheduleController from "../controllers/schedule.controller"
import { requireAuth, requirePermission } from "../middleware/auth.middleware"
import { validateRequest } from "../middleware/validateRequest.middleware"
import { scheduleRepository as defaultScheduleRepository } from "../repositories/schedule.repository"
import { IScheduleRepository } from "../repositories/schedule.repository.interface"
import {
    previewScheduleBodySchema,
    previewScheduleQuerySchema,
    scheduleConfigBodySchema,
} from "../schemas/schedule.schema"
import { createScheduleService, IScheduleService } from "../services/schedule.service"

interface ScheduleRoutesDependencies {
    repository?: IScheduleRepository
    service?: IScheduleService
    authMiddleware?: RequestHandler
}

export class ScheduleRoutes {
    private scheduleController: ScheduleController
    private router: Router = Router()

    constructor({
        repository = defaultScheduleRepository,
        service,
        authMiddleware = requireAuth,
    }: ScheduleRoutesDependencies = {}) {
        const resolvedService = service ?? createScheduleService(repository)
        this.scheduleController = new ScheduleController({ service: resolvedService })
        const controller = this.scheduleController

        this.router.use((_req: Request, res: Response, next: NextFunction) => {
            res.set("Cache-Control", "no-store")
            next()
        })

        this.router.use(authMiddleware)
        this.router.use(requirePermission("schedule.configure"))

        this.router.get("/", controller.getConfig.bind(controller))

        this.router.put(
            "/",
            validateRequest({ body: scheduleConfigBodySchema }),
            controller.saveConfig.bind(controller),
        )

        this.router.get(
            "/preview",
            validateRequest({ query: previewScheduleQuerySchema }),
            controller.getPreview.bind(controller),
        )

        this.router.post(
            "/preview",
            validateRequest({ body: previewScheduleBodySchema }),
            controller.postPreview.bind(controller),
        )
    }

    public getRouter(): Router {
        return this.router
    }
}

const scheduleRoutes = new ScheduleRoutes().getRouter()
export default scheduleRoutes
