import { Router } from "express"
import { createWhatsappSession } from "../controllers/whatsappSession.controller"

const router = Router()

router.post("/", createWhatsappSession)

export default router
