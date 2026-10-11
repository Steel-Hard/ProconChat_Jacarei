import { Router } from "express"
import { changePassword, login, logout, whoAmI } from "../controllers/auth.controller"
import { requireAuth } from "../middleware/token.middleware"

const router = Router()

router.post("/login", login)
router.post("/logout", requireAuth, logout)
router.get("/me", requireAuth, whoAmI)
router.post("/change-password", requireAuth, changePassword)

export default router
