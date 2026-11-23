import type PermissionKey from "@/types/account/PermissionKey.types"

function samePermissions(left: PermissionKey[], right: PermissionKey[]): boolean {
    const set = new Set(left)

    return set.size === new Set(right).size && right.every((key) => set.has(key))
}

export default samePermissions
