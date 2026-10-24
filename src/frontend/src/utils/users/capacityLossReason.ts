import type CapacityLossReason from "@/types/users/CapacityLossReason.types"
import type UserAccount from "@/types/users/UserAccount.types"

const MANAGE = "appointments.manage"

function capacityLossReason(current: UserAccount, next: UserAccount): CapacityLossReason | null {
    if (!current.active) {
        return null
    }

    if (!next.active) {
        return "deactivate"
    }

    const lostManage = current.permissions.includes(MANAGE) && !next.permissions.includes(MANAGE)

    return lostManage ? "manageRemoved" : null
}

export default capacityLossReason
