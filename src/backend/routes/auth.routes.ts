import { NextFunction, Request, Response, Router } from "express"
import AuthController from "../controllers/auth.controller"
import { requireAuth } from "../middleware/auth.middleware"

class AuthRoutes {
    private authController: AuthController
    private router: Router = Router()

    constructor() {
        this.authController = new AuthController()

        this.router.use((_req: Request, res: Response, next: NextFunction) => {
            res.set("Cache-Control", "no-store")
            next()
        })

        this.router.post("/login", this.authController.login.bind(this.authController))
        this.router.post("/refresh", this.authController.refresh.bind(this.authController))
        this.router.post("/logout", this.authController.logout.bind(this.authController))
        this.router.get("/me", requireAuth, this.authController.me.bind(this.authController))
        this.router.post("/change-password", requireAuth, this.authController.changePassword.bind(this.authController))
    }

    public getRouter(): Router {
        return this.router
    }
}

const authRoutes = new AuthRoutes().getRouter()
export default authRoutes
