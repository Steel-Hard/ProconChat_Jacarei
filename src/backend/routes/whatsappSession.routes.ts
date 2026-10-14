import { Router } from "express"
import WhatsappSessionController from "../controllers/whatsappSession.controller"

class WhatsappSessionRoutes {
    private whatsappSessionController: WhatsappSessionController
    private router: Router = Router()

    private url: string = "/"

    constructor() {
        this.whatsappSessionController = new WhatsappSessionController()

        this.router.post(this.url, this.whatsappSessionController.create.bind(this.whatsappSessionController))
    }

    public getRouter(): Router {
        return this.router
    }
}

const whatsappSessionRoutes = new WhatsappSessionRoutes().getRouter()
export default whatsappSessionRoutes
