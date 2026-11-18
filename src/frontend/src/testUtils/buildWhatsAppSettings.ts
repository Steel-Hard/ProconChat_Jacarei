import type WhatsAppSettings from "@/types/whatsapp/WhatsAppSettings.types"

function buildWhatsAppSettings(overrides: Partial<WhatsAppSettings> = {}): WhatsAppSettings {
    return {
        phoneNumberId: "100000000000001",
        businessAccountId: "200000000000002",
        accessToken: { configured: true, last4: "a91F" },
        appSecret: { configured: true, last4: "9c2e" },
        verifyToken: "3f9a".repeat(16),
        webhookUrl: "https://exemplo.sslip.io/webhooks/whatsapp",
        graphApiVersion: "v26.0",
        credentialsValid: true,
        credentialsCheckedAt: "2026-10-14T13:00:00.000Z",
        credentialsStatus: "VALID",
        webhook: { lastEventAt: "2026-10-14T13:00:00.000Z", stale: false },
        autoReplyPaused: false,
        pausedMessage: "Mensagem fixa de pausa",
        cancellationNoticeEnabled: false,
        cancellationNoticeProblem: null,
        updatedBy: { id: 1, name: "Ana Paula" },
        updatedAt: "2026-10-14T13:00:00.000Z",
        displayPhoneNumber: "+55 12 3955-9000",
        verifiedName: "PROCON Jacareí",
        accessTokenLifetime: { kind: "UNKNOWN", expiresAt: null },
        ...overrides
    }
}

export default buildWhatsAppSettings
