import type WhatsAppCancellationNoticeProblemCode from "@/types/whatsapp/WhatsAppCancellationNoticeProblemCode.types"

type WhatsAppCancellationNoticeProblem = {
    code: WhatsAppCancellationNoticeProblemCode
    metaErrorCode: string | null
    message: string
}

export default WhatsAppCancellationNoticeProblem
