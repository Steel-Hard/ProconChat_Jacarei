import PERMISSION_KEYS from "@/navigation/permissionKeys"
import type PermissionKey from "@/types/account/PermissionKey.types"

function orderedPermissions(permissions: PermissionKey[]): PermissionKey[] {
    return PERMISSION_KEYS.filter((key) => permissions.includes(key))
}

export default orderedPermissions
