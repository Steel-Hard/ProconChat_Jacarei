import express, { Router } from "express"
import WhatsappWebhookController from "../controllers/whatsappWebhook.controller"

class WhatsappWebhookRoutes {
    private whatsappWebhookController: WhatsappWebhookController
    private router: Router = Router()

    private url: string = "/"

    constructor() {
        this.whatsappWebhookController = new WhatsappWebhookController()

        this.router.get(this.url, this.whatsappWebhookController.verify.bind(this.whatsappWebhookController))
        this.router.post(
            this.url,
            express.raw({ type: "application/json" }),
            this.whatsappWebhookController.receive.bind(this.whatsappWebhookController),
        )
        this.router.use(this.whatsappWebhookController.handleRawBodyError.bind(this.whatsappWebhookController))
    }

    public getRouter(): Router {
        return this.router
    }
}

const whatsappWebhookRoutes = new WhatsappWebhookRoutes().getRouter()
export default whatsappWebhookRoutes
