import { NextFunction, Request, Response, Router } from "express"
import PrivacySettingsController from "../controllers/privacySettings.controller"
import WhatsAppSettingsController from "../controllers/whatsappSettings.controller"
import { requireAuth, requirePermission } from "../middleware/auth.middleware"
import { validateRequest } from "../middleware/validateRequest.middleware"
import { privacySettingsBodySchema } from "../schemas/privacySettings.schema"
import { retentionPreviewQuerySchema } from "../schemas/retentionPreview.schema"
import { ADMIN_ONLY } from "../types/auth.types"

class WhatsAppSettingsRoutes {
    private whatsAppSettingsController: WhatsAppSettingsController
    private router: Router = Router()

    constructor() {
        this.whatsAppSettingsController = new WhatsAppSettingsController()
        const controller = this.whatsAppSettingsController
        const privacy = new PrivacySettingsController()
        const adminOnly = [requireAuth, requirePermission(ADMIN_ONLY)]

        this.router.use((_req: Request, res: Response, next: NextFunction) => {
            res.set("Cache-Control", "no-store")
            next()
        })

        this.router.get("/", ...adminOnly, controller.get.bind(controller))
        this.router.put("/", ...adminOnly, controller.save.bind(controller))
        this.router.post("/test", ...adminOnly, controller.test.bind(controller))
        this.router.post("/pause", ...adminOnly, controller.pause.bind(controller))
        this.router.post("/resume", ...adminOnly, controller.resume.bind(controller))
        this.router.get("/templates", ...adminOnly, controller.templates.bind(controller))
        this.router.get("/number-status", ...adminOnly, controller.numberStatus.bind(controller))
        this.router.get("/delivery-failures", ...adminOnly, controller.deliveryFailures.bind(controller))
        this.router.get("/history", ...adminOnly, controller.history.bind(controller))
        this.router.get("/privacy", ...adminOnly, privacy.getAdmin.bind(privacy))
        this.router.get(
            "/privacy/retention-preview",
            ...adminOnly,
            validateRequest({ query: retentionPreviewQuerySchema }, { withIssues: true }),
            privacy.retentionPreview.bind(privacy),
        )
        this.router.put(
            "/privacy",
            ...adminOnly,
            validateRequest({ body: privacySettingsBodySchema }, { withIssues: true }),
            privacy.save.bind(privacy),
        )
    }

    public getRouter(): Router {
        return this.router
    }
}

const whatsappSettingsRoutes = new WhatsAppSettingsRoutes().getRouter()
export default whatsappSettingsRoutes
