import type CancellationReason from "@/types/appointments/CancellationReason.types"
import type WhatsAppCancellationNoticeProblem from "@/types/whatsapp/WhatsAppCancellationNoticeProblem.types"

type CancellationPreview = {
    noticeEnabled: boolean
    problem: WhatsAppCancellationNoticeProblem | null
    previews: { reason: CancellationReason; message: string }[]
}

export default CancellationPreview
