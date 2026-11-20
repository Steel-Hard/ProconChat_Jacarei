import type WhatsAppMessageTemplateStatus from "@/types/whatsapp/WhatsAppMessageTemplateStatus.types"
import type WhatsAppTemplateTone from "@/types/whatsapp/WhatsAppTemplateTone.types"

const TONES: Record<WhatsAppMessageTemplateStatus["status"], WhatsAppTemplateTone> = {
    APPROVED: "success",
    PENDING: "warning",
    OTHER: "warning",
    REJECTED: "danger",
    NOT_FOUND: "danger"
}

function whatsAppTemplateToneOf(status: WhatsAppMessageTemplateStatus["status"]) {
    return TONES[status]
}

export default whatsAppTemplateToneOf
