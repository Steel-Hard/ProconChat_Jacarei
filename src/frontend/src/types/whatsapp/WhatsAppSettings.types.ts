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

export default WhatsAppSettings
