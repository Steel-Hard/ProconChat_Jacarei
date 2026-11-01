import { NextFunction, Request, Response, Router } from "express"
import WhatsAppSettingsController from "../controllers/whatsappSettings.controller"
import { requireAuth, requirePermission } from "../middleware/auth.middleware"
import { ADMIN_ONLY } from "../types/auth.types"

class WhatsAppSettingsRoutes {
    private whatsAppSettingsController: WhatsAppSettingsController
    private router: Router = Router()

    constructor() {
        this.whatsAppSettingsController = new WhatsAppSettingsController()
        const controller = this.whatsAppSettingsController
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
    }

    public getRouter(): Router {
        return this.router
    }
}

const whatsappSettingsRoutes = new WhatsAppSettingsRoutes().getRouter()
export default whatsappSettingsRoutes
