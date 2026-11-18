import type WhatsAppDeliveryFailure from "@/types/whatsapp/WhatsAppDeliveryFailure.types"

type WhatsAppDeliveryFailures = {
    since: string
    count: number
    items: WhatsAppDeliveryFailure[]
}

export default WhatsAppDeliveryFailures
