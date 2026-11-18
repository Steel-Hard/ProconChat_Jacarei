import { describe, expect, it } from "vitest"
import whatsAppLimitOf from "@/utils/whatsAppLimitOf"

describe("whatsAppLimitOf", () => {
    it.each([
        ["TIER_250", 250],
        ["TIER_1K", 1000],
        ["TIER_10K", 10000],
        ["TIER_100K", 100000]
    ])("traduz o patamar %s para o limite diário", (tier, total) => {
        expect(whatsAppLimitOf({ tier, dailyLimit: null, usedLast24h: 50 })).toEqual({
            kind: "limited",
            total,
            used: 50,
            percent: (50 / total) * 100
        })
    })

    it("prefere o limite numérico informado pela Meta", () => {
        expect(whatsAppLimitOf({ tier: "TIER_250", dailyLimit: 100, usedLast24h: 85 })).toEqual({
            kind: "limited",
            total: 100,
            used: 85,
            percent: 85
        })
    })

    it("limita o percentual a 100", () => {
        expect(whatsAppLimitOf({ tier: null, dailyLimit: 100, usedLast24h: 150 })).toMatchObject({
            percent: 100
        })
    })

    it("trata o patamar ilimitado como sem limite", () => {
        expect(
            whatsAppLimitOf({ tier: "TIER_UNLIMITED", dailyLimit: null, usedLast24h: 9 })
        ).toEqual({
            kind: "unlimited"
        })
    })

    it.each([
        [null, null],
        ["TIER_NOVO", null],
        [null, 0]
    ])("trata como não informado (patamar %s, limite %s)", (tier, dailyLimit) => {
        expect(whatsAppLimitOf({ tier, dailyLimit, usedLast24h: 9 })).toEqual({ kind: "unknown" })
    })
})
