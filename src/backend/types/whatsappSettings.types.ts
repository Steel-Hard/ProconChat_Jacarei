import { OutboundKind } from "./outboundMessage.types"

export type AccessTokenLifetime =
    | { kind: "PERMANENT"; expiresAt: null }
    | { kind: "EXPIRING"; expiresAt: string }
    | { kind: "UNKNOWN"; expiresAt: null }

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
    displayPhoneNumber: string | null
    verifiedName: string | null
    accessTokenLifetime: AccessTokenLifetime
    lastWebhookEventAt: Date | null
    updatedBy: WhatsAppSettingsUpdatedBy | null
    updatedAt: Date
}

export interface VerifiedPhoneNumber {
    displayPhoneNumber: string
    verifiedName: string
}

export interface SaveCredentialsInput {
    phoneNumberId: string
    businessAccountId: string | null
    accessTokenEncrypted: string
    appSecretEncrypted: string
    displayPhoneNumber: string
    verifiedName: string
    accessTokenLifetime: AccessTokenLifetime | null
    updatedBy: number
    auditFields: WhatsAppAuditField[]
}

export interface WhatsAppHistoryItemView {
    id: string
    action: string
    fields: string[]
    actor: WhatsAppSettingsUpdatedBy | null
    createdAt: string
}

export interface WhatsAppHistoryView {
    items: WhatsAppHistoryItemView[]
}

export type WhatsAppAuditField = "phoneNumberId" | "businessAccountId" | "accessToken" | "appSecret"

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
    displayPhoneNumber: string | null
    verifiedName: string | null
    accessTokenLifetime: AccessTokenLifetime
    credentialsStatus: CredentialsStatus
    webhook: WebhookStatusView
}

export interface DeliveryFailureView {
    id: string
    kind: OutboundKind
    errorCode: string | null
    failedAt: string
    appointmentId: string | null
}

export interface DeliveryFailuresView {
    since: string
    count: number
    items: DeliveryFailureView[]
}

export type CredentialsStatus = "NOT_CHECKED" | "INVALID" | "EXPIRED" | "VALID"

export interface WebhookStatusView {
    lastEventAt: string | null
    stale: boolean
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
    | { ok: true; displayPhoneNumber: string; verifiedName: string; checkedAt: string; accessTokenLifetime: AccessTokenLifetime }
    | { ok: false; reason: ConnectionTestReason; checkedAt: string }

export interface WhatsAppInternalConfig {
    phoneNumberId: string | null
    accessToken: string | null
    appSecret: string | null
    verifyToken: string
    graphApiVersion: string
}

export type MetaAuthInput = Pick<ConnectionCheckInput, "accessToken" | "appSecret" | "graphApiVersion">

export type MessageTemplateKind = "CANCELLATION" | "REMINDER"

export type MessageTemplateStatusCode = "APPROVED" | "PENDING" | "REJECTED" | "NOT_FOUND" | "OTHER"

export interface MessageTemplateRef {
    kind: MessageTemplateKind
    name: string
    languageCode: string
}

export interface MessageTemplateStatus extends MessageTemplateRef {
    status: MessageTemplateStatusCode
    metaStatus: string | null
}

export type TemplatesStatusResult =
    | { ok: true; templates: MessageTemplateStatus[] }
    | { ok: false; reason: ConnectionTestReason }

export interface TemplatesStatusView {
    checkedAt: string
    templates: MessageTemplateStatus[]
}

export type QualityRating = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN"

export type PhoneNumberStatusResult =
    | { ok: true; qualityRating: QualityRating; tier: string | null; dailyLimit: number | null }
    | { ok: false; reason: ConnectionTestReason }

export interface NumberStatusView {
    checkedAt: string
    qualityRating: QualityRating
    messagingLimit: { tier: string | null; dailyLimit: number | null; usedLast24h: number }
}

