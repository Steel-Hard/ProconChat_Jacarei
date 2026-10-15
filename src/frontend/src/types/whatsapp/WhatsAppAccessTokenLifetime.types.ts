type WhatsAppAccessTokenLifetime =
    | { kind: "PERMANENT"; expiresAt: null }
    | { kind: "EXPIRING"; expiresAt: string }
    | { kind: "UNKNOWN"; expiresAt: null }

export default WhatsAppAccessTokenLifetime
