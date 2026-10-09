import express, { Router } from "express"
import {
    handleRawBodyError,
    receiveWhatsappWebhook,
    verifyWhatsappWebhook,
} from "../controllers/whatsappWebhook.controller"

const router = Router()

router.get("/", verifyWhatsappWebhook)
router.post("/", express.raw({ type: "application/json" }), receiveWhatsappWebhook)
router.use(handleRawBodyError)

export default router
