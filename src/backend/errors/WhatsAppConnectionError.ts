import AppError from "./AppError"
import { ConnectionTestReason } from "../types/whatsappSettings.types"

class WhatsAppConnectionError extends AppError {
    constructor(reason: ConnectionTestReason) {
        super("WhatsApp connection test failed", 422, reason)
    }
}

export default WhatsAppConnectionError
