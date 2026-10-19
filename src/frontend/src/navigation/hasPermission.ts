import type PanelAccount from "@/types/account/PanelAccount.types"
import type PermissionKey from "@/types/account/PermissionKey.types"

const IMPLIED_BY: Partial<Record<PermissionKey, PermissionKey[]>> = {
    "appointments.view": ["appointments.manage"]
}

function hasPermission(account: PanelAccount | null, permission: PermissionKey): boolean {
    if (account === null) {
        return false
    }

    if (account.isAdmin) {
        return true
    }

    const accepted = [permission, ...(IMPLIED_BY[permission] ?? [])]

    return accepted.some((key) => account.permissions.includes(key))
}

export default hasPermission
