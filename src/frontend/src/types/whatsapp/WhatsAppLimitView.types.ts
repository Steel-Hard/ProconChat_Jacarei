type WhatsAppLimitView =
    | { kind: "limited"; total: number; used: number; percent: number }
    | { kind: "unlimited" }
    | { kind: "unknown" }

export default WhatsAppLimitView
