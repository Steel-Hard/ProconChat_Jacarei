import { NextFunction, Request, Response, Router } from "express"
import WhatsAppInternalEventsController from "../controllers/whatsappInternalEvents.controller"

class WhatsAppInternalEventsRoutes {
    private whatsAppInternalEventsController: WhatsAppInternalEventsController
    private router: Router = Router()

    constructor() {
        this.whatsAppInternalEventsController = new WhatsAppInternalEventsController()

        this.router.use((_req: Request, res: Response, next: NextFunction) => {
            res.set("Cache-Control", "no-store")
            next()
        })

        this.router.post("/", this.whatsAppInternalEventsController.create.bind(this.whatsAppInternalEventsController))
    }

    public getRouter(): Router {
        return this.router
    }
}

const whatsappInternalEventsRoutes = new WhatsAppInternalEventsRoutes().getRouter()
export default whatsappInternalEventsRoutes
