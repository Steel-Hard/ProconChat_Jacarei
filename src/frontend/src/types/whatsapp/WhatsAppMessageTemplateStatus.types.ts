type WhatsAppMessageTemplateStatus = {
    kind: "CANCELLATION" | "REMINDER"
    name: string
    languageCode: string
    status: "APPROVED" | "PENDING" | "REJECTED" | "NOT_FOUND" | "OTHER"
    metaStatus: string | null
}

export default WhatsAppMessageTemplateStatus
