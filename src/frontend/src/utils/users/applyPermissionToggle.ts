import PERMISSION_KEYS from "@/navigation/permissionKeys"
import type PermissionKey from "@/types/account/PermissionKey.types"

const VIEW: PermissionKey = "appointments.view"
const MANAGE: PermissionKey = "appointments.manage"

function applyPermissionToggle(permissions: PermissionKey[], key: PermissionKey): PermissionKey[] {
    const next = new Set(permissions)

    if (next.has(key)) {
        next.delete(key)

        if (key === VIEW) {
            next.delete(MANAGE)
        }
    } else {
        next.add(key)

        if (key === MANAGE) {
            next.add(VIEW)
        }
    }

    return PERMISSION_KEYS.filter((permission) => next.has(permission))
}

export default applyPermissionToggle
