import type PermissionKey from "@/types/account/PermissionKey.types"

type UserAccount = {
    id: number
    name: string
    email: string
    isAdmin: boolean
    active: boolean
    permissions: PermissionKey[]
    lastLoginAt: string | null
    permissionsUpdatedAt: string | null
    permissionsUpdatedBy: { id: number; name: string } | null
}

export default UserAccount
