import { Router } from "express"
import InternalConfigController from "../controllers/internalConfig.controller"

class InternalConfigRoutes {
    private internalConfigController: InternalConfigController
    private router: Router = Router()

    constructor() {
        this.internalConfigController = new InternalConfigController()

        this.router.post("/reload", this.internalConfigController.reload.bind(this.internalConfigController))
    }

    public getRouter(): Router {
        return this.router
    }
}

const internalConfigRoutes = new InternalConfigRoutes().getRouter()
export default internalConfigRoutes
