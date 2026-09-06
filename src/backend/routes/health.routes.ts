import { Router } from "express"
import HealthController from "../controllers/health.controller"

class HealthRoutes {
    private healthController: HealthController
    private router: Router = Router()

    private url: string = "/"

    constructor() {
        this.healthController = new HealthController()

        this.router.get(this.url, this.healthController.check.bind(this.healthController))
    }

    public getRouter(): Router {
        return this.router
    }
}

const healthRoutes = new HealthRoutes().getRouter()
export default healthRoutes
