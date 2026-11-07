type WhatsAppNumberMetaStatus = {
    checkedAt: string
    qualityRating: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN"
    messagingLimit: {
        tier: string | null
        dailyLimit: number | null
        usedLast24h: number
    }
}

export default WhatsAppNumberMetaStatus
