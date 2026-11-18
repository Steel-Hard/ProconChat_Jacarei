import type WhatsAppConnectionReason from "@/types/whatsapp/WhatsAppConnectionReason.types"
import apiErrorCodeOf from "@/utils/apiErrorCodeOf"

const REASONS: WhatsAppConnectionReason[] = [
    "INVALID_TOKEN",
    "INVALID_APP_SECRET",
    "PHONE_NUMBER_NOT_FOUND",
    "BUSINESS_ACCOUNT_NOT_FOUND",
    "PHONE_NOT_IN_ACCOUNT",
    "MISSING_PERMISSION",
    "META_UNAVAILABLE",
    "META_ERROR"
]

function whatsAppConnectionReasonOf(error: unknown): WhatsAppConnectionReason | null {
    const code = apiErrorCodeOf(error)

    return REASONS.find((reason) => reason === code) ?? null
}

export default whatsAppConnectionReasonOf
