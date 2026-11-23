import type UserAccount from "@/types/users/UserAccount.types"
import canAttend from "@/utils/users/canAttend"

function reassignmentTargets(accounts: UserAccount[], userId: number): UserAccount[] {
    return accounts.filter((account) => account.id !== userId && canAttend(account))
}

export default reassignmentTargets
