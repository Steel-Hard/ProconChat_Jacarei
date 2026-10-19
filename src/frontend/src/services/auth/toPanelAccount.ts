import PERMISSION_KEYS from "@/navigation/permissionKeys"
import type PanelAccount from "@/types/account/PanelAccount.types"
import type PermissionKey from "@/types/account/PermissionKey.types"

type AuthUser = {
    id: number
    name: string
    email: string
    isAdmin: boolean
    permissions: string[]
}

function isPermissionKey(value: string): value is PermissionKey {
    return (PERMISSION_KEYS as readonly string[]).includes(value)
}

function toPanelAccount(user: AuthUser): PanelAccount {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        permissions: user.permissions.filter(isPermissionKey)
    }
}

export default toPanelAccount
