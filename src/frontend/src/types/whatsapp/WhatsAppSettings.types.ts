import type WhatsAppAccessTokenLifetime from "@/types/whatsapp/WhatsAppAccessTokenLifetime.types"

type WhatsAppSettings = {
    phoneNumberId: string | null
    businessAccountId: string | null
    accessToken: { configured: boolean; last4: string | null }
    appSecret: { configured: boolean; last4: string | null }
    verifyToken: string
    webhookUrl: string | null
    graphApiVersion: string
    credentialsValid: boolean | null
    credentialsCheckedAt: string | null
    credentialsStatus: "NOT_CHECKED" | "INVALID" | "EXPIRED" | "VALID"
    webhook: { lastEventAt: string | null; stale: boolean }
    autoReplyPaused: boolean
    pausedMessage: string
    updatedBy: { id: number; name: string } | null
    updatedAt: string
    displayPhoneNumber: string | null
    verifiedName: string | null
    accessTokenLifetime: WhatsAppAccessTokenLifetime
}

export type WhatsAppDeliveryFailure = {
    id: string
    kind: "REPLY" | "CONFIRMATION" | "PAUSED" | "CANCELLATION" | "REMINDER"
    errorCode: string | null
    failedAt: string
    appointmentId: string | null
}

export type WhatsAppDeliveryFailures = {
    since: string
    count: number
    items: WhatsAppDeliveryFailure[]
}

export type WhatsAppHistoryItem = {
    id: string
    action: string
    fields: string[]
    actor: { id: number; name: string } | null
    createdAt: string
}

export type WhatsAppHistory = { items: WhatsAppHistoryItem[] }

export default WhatsAppSettings
