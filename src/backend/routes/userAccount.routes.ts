import { NextFunction, Request, RequestHandler, Response, Router } from "express"
import UserAccountController from "../controllers/userAccount.controller"
import { requireAuth, requirePermission } from "../middleware/auth.middleware"
import { validateRequest } from "../middleware/validateRequest.middleware"
import {
    accountBatchBodySchema,
    createAccountBodySchema,
    resetPasswordBodySchema,
    userIdParamSchema,
} from "../schemas/userAccount.schema"
import { userAccountService as defaultUserAccountService, UserAccountService } from "../services/userAccount.service"

interface UserAccountRoutesDependencies {
    service?: UserAccountService
    authMiddleware?: RequestHandler
}

export class UserAccountRoutes {
    private router: Router = Router()

    constructor({ service = defaultUserAccountService, authMiddleware = requireAuth }: UserAccountRoutesDependencies = {}) {
        const controller = new UserAccountController({ service })

        this.router.use((_req: Request, res: Response, next: NextFunction) => {
            res.set("Cache-Control", "no-store")
            next()
        })
        this.router.use(authMiddleware, requirePermission("users.manage"))

        this.router.get("/", controller.list.bind(controller))
        this.router.post("/", validateRequest({ body: createAccountBodySchema }), controller.create.bind(controller))
        this.router.patch("/", validateRequest({ body: accountBatchBodySchema }), controller.saveBatch.bind(controller))
        this.router.get(
            "/:id/future-appointments",
            validateRequest({ params: userIdParamSchema }),
            controller.futureAppointments.bind(controller),
        )
        this.router.post(
            "/:id/reset-password",
            validateRequest({ params: userIdParamSchema, body: resetPasswordBodySchema }),
            controller.resetPassword.bind(controller),
        )
    }

    public getRouter(): Router {
        return this.router
    }
}

const userAccountRoutes = new UserAccountRoutes().getRouter()
export default userAccountRoutes
