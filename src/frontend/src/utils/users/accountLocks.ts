import type PanelAccount from "@/types/account/PanelAccount.types"
import type AccountLocks from "@/types/users/AccountLocks.types"
import type UserAccount from "@/types/users/UserAccount.types"

function accountLocks(actor: PanelAccount, target: UserAccount): AccountLocks {
    const self = target.id === actor.id
    const selfLocked = self && !target.isAdmin
    const outranks =
        !actor.isAdmin &&
        !target.isAdmin &&
        target.permissions.some((key) => !actor.permissions.includes(key))

    return {
        selfLocked,
        outranks,
        canManage: !selfLocked && !outranks,
        showActions: !target.isAdmin || self,
        showReset: !target.isAdmin && !self,
        showToggle: !target.isAdmin,
        showSelfPassword: self
    }
}

export default accountLocks
