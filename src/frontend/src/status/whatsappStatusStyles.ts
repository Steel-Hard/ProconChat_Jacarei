import type WhatsAppStatus from "@/types/status/WhatsAppStatus.types"
import type WhatsAppStatusStyle from "@/types/status/WhatsAppStatusStyle.types"

const WHATSAPP_STATUS: Record<WhatsAppStatus, WhatsAppStatusStyle> = {
    OPERATING: { bg: "#DFF1E6", fg: "#1B6138", dot: "#2E8B57" },
    PAUSED: { bg: "#FCEFD6", fg: "#7A4F00", dot: "#D99A1E" },
    INVALID_CREDENTIALS: { bg: "#FAE3E0", fg: "#8E2C22", dot: "#C0392B" },
    NOT_VERIFIED: { bg: "#EDECF1", fg: "#55516A", dot: "#8A869C" },
    NOT_CONFIGURED: { bg: "#EDECF1", fg: "#55516A", dot: "#8A869C" }
}

export default WHATSAPP_STATUS
