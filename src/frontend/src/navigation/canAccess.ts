import type PanelAccount from "@/types/account/PanelAccount.types"
import type PermissionKey from "@/types/account/PermissionKey.types"
import type NavKey from "@/types/navigation/NavKey.types"

type AccessRule = { adminOnly: true } | { anyOf: PermissionKey[] }

const ACCESS_RULES: Record<NavKey, AccessRule> = {
    dashboard: {
        anyOf: ["appointments.view", "appointments.manage", "sessions.view", "reports.view"]
    },
    appointments: { anyOf: ["appointments.view", "appointments.manage"] },
    reports: { anyOf: ["reports.view"] },
    content: { anyOf: ["content.manage"] },
    sessions: { anyOf: ["sessions.view"] },
    schedule: { anyOf: ["schedule.configure"] },
    documents: { anyOf: ["documents.configure"] },
    users: { anyOf: ["users.manage"] },
    whatsapp: { adminOnly: true }
}

function canAccess(account: PanelAccount | null, key: NavKey): boolean {
    if (account === null) {
        return false
    }

    if (account.isAdmin) {
        return true
    }

    const rule = ACCESS_RULES[key]

    if ("adminOnly" in rule) {
        return false
    }

    return rule.anyOf.some((permission) => account.permissions.includes(permission))
}

export default canAccess
