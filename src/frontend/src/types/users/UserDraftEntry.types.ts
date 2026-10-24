import type PermissionKey from "@/types/account/PermissionKey.types"
import type DraftReassignment from "@/types/users/DraftReassignment.types"

type UserDraftEntry = {
    permissions?: PermissionKey[]
    active?: boolean
    reassignment?: DraftReassignment
}

export default UserDraftEntry
