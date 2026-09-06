import { Router } from "express"
import { receiveEvolutionWebhook } from "../controllers/evolutionWebhook.controller"

const router = Router()

router.post("/", receiveEvolutionWebhook)

export default router
