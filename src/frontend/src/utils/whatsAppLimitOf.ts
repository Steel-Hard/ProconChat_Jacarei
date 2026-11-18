import type WhatsAppNumberMetaStatus from "@/types/whatsapp/WhatsAppNumberMetaStatus.types"
import type WhatsAppLimitView from "@/types/whatsapp/WhatsAppLimitView.types"

const TIER_TOTALS: Record<string, number> = {
    TIER_250: 250,
    TIER_1K: 1000,
    TIER_10K: 10000,
    TIER_100K: 100000
}

const UNLIMITED_TIER = "TIER_UNLIMITED"

function whatsAppLimitOf(limit: WhatsAppNumberMetaStatus["messagingLimit"]): WhatsAppLimitView {
    if (limit.tier === UNLIMITED_TIER) {
        return { kind: "unlimited" }
    }

    const fromTier = limit.tier === null ? undefined : TIER_TOTALS[limit.tier]
    const total = limit.dailyLimit !== null && limit.dailyLimit > 0 ? limit.dailyLimit : fromTier

    if (total === undefined) {
        return { kind: "unknown" }
    }

    return {
        kind: "limited",
        total,
        used: limit.usedLast24h,
        percent: Math.min(100, (limit.usedLast24h / total) * 100)
    }
}

export default whatsAppLimitOf
