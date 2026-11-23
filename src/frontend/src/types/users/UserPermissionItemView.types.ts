import type PermissionKey from "@/types/account/PermissionKey.types"

type UserPermissionItemView = {
    key: PermissionKey
    name: string
    description: string
    includes: string | null
    checked: boolean
    disabled: boolean
    warning: string | null
}

export default UserPermissionItemView
