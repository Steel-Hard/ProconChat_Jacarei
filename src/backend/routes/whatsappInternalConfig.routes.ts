import { NextFunction, Request, Response, Router } from "express"
import WhatsAppInternalConfigController from "../controllers/whatsappInternalConfig.controller"

class WhatsAppInternalConfigRoutes {
    private whatsAppInternalConfigController: WhatsAppInternalConfigController
    private router: Router = Router()

    constructor() {
        this.whatsAppInternalConfigController = new WhatsAppInternalConfigController()

        this.router.use((_req: Request, res: Response, next: NextFunction) => {
            res.set("Cache-Control", "no-store")
            next()
        })

        this.router.get("/", this.whatsAppInternalConfigController.get.bind(this.whatsAppInternalConfigController))
    }

    public getRouter(): Router {
        return this.router
    }
}

const whatsappInternalConfigRoutes = new WhatsAppInternalConfigRoutes().getRouter()
export default whatsappInternalConfigRoutes
