import { Router } from "express"
import InternalMessagesController, {
    InternalMessagesControllerDependencies,
} from "../controllers/internalMessages.controller"

export class InternalMessagesRoutes {
    private internalMessagesController: InternalMessagesController
    private router: Router = Router()

    constructor(dependencies: InternalMessagesControllerDependencies = {}) {
        this.internalMessagesController = new InternalMessagesController(dependencies)

        this.router.post(
            "/template",
            this.internalMessagesController.sendTemplate.bind(this.internalMessagesController),
        )
    }

    public getRouter(): Router {
        return this.router
    }
}

const internalMessagesRoutes = new InternalMessagesRoutes().getRouter()
export default internalMessagesRoutes
