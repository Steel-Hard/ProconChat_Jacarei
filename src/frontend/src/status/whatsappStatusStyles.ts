import type WhatsAppStatus from "@/types/status/WhatsAppStatus.types"
import type WhatsAppStatusStyle from "@/types/status/WhatsAppStatusStyle.types"

const WHATSAPP_STATUS: Record<WhatsAppStatus, WhatsAppStatusStyle> = {
    OPERATING: { bg: "#DFF1E6", fg: "#1B6138" },
    PAUSED: { bg: "#FCEFD6", fg: "#7A4F00" },
    INVALID_CREDENTIALS: { bg: "#FAE3E0", fg: "#8E2C22" },
    NOT_VERIFIED: { bg: "#EDECF1", fg: "#55516A" },
    NOT_CONFIGURED: { bg: "#EDECF1", fg: "#55516A" }
}

export default WHATSAPP_STATUS
