import type UserAccount from "@/types/users/UserAccount.types"
import type UserDraft from "@/types/users/UserDraft.types"
import canAttend from "@/utils/users/canAttend"
import effectiveAccounts from "@/utils/users/effectiveAccounts"

function pruneReassignments(draft: UserDraft, accounts: UserAccount[]): UserDraft {
    const attending = new Set(
        effectiveAccounts(accounts, draft)
            .filter(canAttend)
            .map((account) => account.id)
    )
    const next: UserDraft = {}

    for (const [id, entry] of Object.entries(draft)) {
        const userId = Number(id)

        if (entry.reassignment !== undefined && attending.has(userId)) {
            const { reassignment: _removed, ...rest } = entry
            next[userId] = rest
        } else {
            next[userId] = entry
        }
    }

    return next
}

export default pruneReassignments
