import { NextFunction, Request, Response, Router } from "express"
import PrivacySettingsController from "../controllers/privacySettings.controller"

class PrivacyPublicRoutes {
    private privacySettingsController: PrivacySettingsController
    private router: Router = Router()

    constructor() {
        this.privacySettingsController = new PrivacySettingsController()
        const controller = this.privacySettingsController

        this.router.use((_req: Request, res: Response, next: NextFunction) => {
            res.set("Cache-Control", "no-store")
            next()
        })

        this.router.get("/", controller.getPublic.bind(controller))
    }

    public getRouter(): Router {
        return this.router
    }
}

const privacyPublicRoutes = new PrivacyPublicRoutes().getRouter()
export default privacyPublicRoutes
