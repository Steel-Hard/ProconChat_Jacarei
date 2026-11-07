import type WhatsAppMessageTemplateStatus from "@/types/whatsapp/WhatsAppMessageTemplateStatus.types"

type WhatsAppTemplatesStatus = {
    checkedAt: string
    templates: WhatsAppMessageTemplateStatus[]
}

export default WhatsAppTemplatesStatus
