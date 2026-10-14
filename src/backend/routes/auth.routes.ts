import { NextFunction, Request, Response, Router } from "express"
import { changePassword, login, logout, me, refresh } from "../controllers/auth.controller"
import { requireAuth } from "../middleware/auth.middleware"

const router = Router()

router.use((_req: Request, res: Response, next: NextFunction) => {
    res.set("Cache-Control", "no-store")
    next()
})

router.post("/login", login)
router.post("/refresh", refresh)
router.post("/logout", logout)
router.get("/me", requireAuth, me)
router.post("/change-password", requireAuth, changePassword)

export default router
