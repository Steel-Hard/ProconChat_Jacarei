export interface WhatsAppSettingsUpdatedBy {
    id: number
    name: string
}

export interface WhatsAppSettingsRow {
    phoneNumberId: string | null
    businessAccountId: string | null
    accessTokenEncrypted: string | null
    appSecretEncrypted: string | null
    verifyToken: string
    autoReplyPaused: boolean
    credentialsCheckedAt: Date | null
    credentialsValid: boolean | null
    updatedBy: WhatsAppSettingsUpdatedBy | null
    updatedAt: Date
}

export interface SaveCredentialsInput {
    phoneNumberId: string
    businessAccountId: string | null
    accessTokenEncrypted: string
    appSecretEncrypted: string
    updatedBy: number
}

export interface SecretView {
    configured: boolean
    last4: string | null
}

export interface WhatsAppSettingsView {
    phoneNumberId: string | null
    businessAccountId: string | null
    accessToken: SecretView
    appSecret: SecretView
    verifyToken: string
    webhookUrl: string | null
    graphApiVersion: string
    credentialsValid: boolean | null
    credentialsCheckedAt: string | null
    autoReplyPaused: boolean
    pausedMessage: string
    updatedBy: WhatsAppSettingsUpdatedBy | null
    updatedAt: string
}

export interface WhatsAppSettingsInput {
    phoneNumberId: string
    businessAccountId: string | null
    accessToken: string | null
    appSecret: string | null
}

export type ConnectionTestReason =
    | "INVALID_TOKEN"
    | "INVALID_APP_SECRET"
    | "PHONE_NUMBER_NOT_FOUND"
    | "BUSINESS_ACCOUNT_NOT_FOUND"
    | "PHONE_NOT_IN_ACCOUNT"
    | "MISSING_PERMISSION"
    | "META_UNAVAILABLE"
    | "META_ERROR"

export interface ConnectionCheckInput {
    phoneNumberId: string
    businessAccountId: string | null
    accessToken: string
    appSecret: string
    graphApiVersion: string
}

export type ConnectionCheckResult =
    | { ok: true; displayPhoneNumber: string; verifiedName: string }
    | { ok: false; reason: ConnectionTestReason }

export type ConnectionTestResult =
    | { ok: true; displayPhoneNumber: string; verifiedName: string; checkedAt: string }
    | { ok: false; reason: ConnectionTestReason; checkedAt: string }

export interface WhatsAppInternalConfig {
    phoneNumberId: string | null
    accessToken: string | null
    appSecret: string | null
    verifyToken: string
    graphApiVersion: string
}
