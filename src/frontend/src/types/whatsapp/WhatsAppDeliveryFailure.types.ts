type WhatsAppDeliveryFailure = {
    id: string
    kind: "REPLY" | "CONFIRMATION" | "PAUSED" | "CANCELLATION" | "REMINDER"
    errorCode: string | null
    failedAt: string
    appointmentId: string | null
}

export default WhatsAppDeliveryFailure
