import PERMISSION_KEYS from "@/navigation/permissionKeys"
import type PanelAccount from "@/types/account/PanelAccount.types"
import type PermissionKey from "@/types/account/PermissionKey.types"
import type PermissionLock from "@/types/users/PermissionLock.types"
import type UserAccount from "@/types/users/UserAccount.types"

function lockReason(
    actor: PanelAccount,
    target: UserAccount,
    key: PermissionKey,
    checked: boolean
): PermissionLock["reason"] {
    if (target.isAdmin) {
        return "admin"
    }

    if (target.id === actor.id) {
        return "self"
    }

    if (actor.isAdmin) {
        return "none"
    }

    if (!actor.permissions.includes(key)) {
        return "lacks"
    }

    const removesManage =
        key === "appointments.view" &&
        checked &&
        target.permissions.includes("appointments.manage") &&
        !actor.permissions.includes("appointments.manage")

    return removesManage ? "cascade" : "none"
}

function permissionLocks(actor: PanelAccount, target: UserAccount): PermissionLock[] {
    return PERMISSION_KEYS.map((key) => {
        const checked = target.isAdmin || target.permissions.includes(key)
        const reason = lockReason(actor, target, key, checked)

        return { key, checked, disabled: reason !== "none", reason }
    })
}

export default permissionLocks
