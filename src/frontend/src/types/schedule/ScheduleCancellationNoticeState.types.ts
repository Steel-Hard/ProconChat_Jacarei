import type WhatsAppCancellationNoticeProblem from "@/types/whatsapp/WhatsAppCancellationNoticeProblem.types"

type ScheduleCancellationNoticeState = {
    enabled: boolean
    problem: WhatsAppCancellationNoticeProblem | null
}

export default ScheduleCancellationNoticeState
