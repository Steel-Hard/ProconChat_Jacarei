import { NextFunction, Request, RequestHandler, Response, Router } from "express"
import ReportController from "../controllers/report.controller"
import { requireAuth, requirePermission } from "../middleware/auth.middleware"
import { validateRequest } from "../middleware/validateRequest.middleware"
import { reportRepository as defaultReportRepository } from "../repositories/report.repository"
import { IReportRepository } from "../repositories/report.repository.interface"
import { reportQuerySchema } from "../schemas/report.schema"
import { createReportService, IReportService } from "../services/report.service"

interface ReportRoutesDependencies {
    repository?: IReportRepository
    service?: IReportService
    authMiddleware?: RequestHandler
}

export class ReportRoutes {
    private reportController: ReportController
    private router: Router = Router()

    constructor({
        repository = defaultReportRepository,
        service,
        authMiddleware = requireAuth,
    }: ReportRoutesDependencies = {}) {
        const resolvedService = service ?? createReportService(repository)
        this.reportController = new ReportController({ service: resolvedService })
        const controller = this.reportController

        this.router.use((_req: Request, res: Response, next: NextFunction) => {
            res.set("Cache-Control", "no-store")
            next()
        })

        this.router.use(authMiddleware)
        this.router.use(requirePermission("reports.view"))

        this.router.get(
            "/",
            validateRequest({ query: reportQuerySchema }, { withIssues: true }),
            controller.getSummary.bind(controller),
        )
    }

    public getRouter(): Router {
        return this.router
    }
}

const reportRoutes = new ReportRoutes().getRouter()
export default reportRoutes
