import type PermissionKey from "@/types/account/PermissionKey.types"

type PermissionLock = {
    key: PermissionKey
    checked: boolean
    disabled: boolean
    reason: "none" | "admin" | "self" | "lacks" | "cascade"
}

export default PermissionLock
