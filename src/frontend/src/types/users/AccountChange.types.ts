import type PermissionKey from "@/types/account/PermissionKey.types"
import type Reassignment from "@/types/users/Reassignment.types"

type AccountChange = {
    userId: number
    permissions?: PermissionKey[]
    active?: boolean
    reassignment?: Reassignment
}

export default AccountChange
