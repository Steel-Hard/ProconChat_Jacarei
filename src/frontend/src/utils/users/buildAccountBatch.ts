import type AccountChange from "@/types/users/AccountChange.types"
import type DraftReassignment from "@/types/users/DraftReassignment.types"
import type Reassignment from "@/types/users/Reassignment.types"
import type UserAccount from "@/types/users/UserAccount.types"
import type UserDraft from "@/types/users/UserDraft.types"
import orderedPermissions from "@/utils/users/orderedPermissions"
import samePermissions from "@/utils/users/samePermissions"

function toReassignment(draft: DraftReassignment): Reassignment {
    return draft.mode === "assign"
        ? { mode: "assign", toUserId: draft.toUserId }
        : { mode: "pending" }
}

function buildAccountBatch(
    accounts: UserAccount[],
    draft: UserDraft
): { changes: AccountChange[] } {
    const changes = accounts
        .toSorted((left, right) => left.id - right.id)
        .flatMap((account) => {
            const entry = draft[account.id]

            if (entry === undefined) {
                return []
            }

            const change: AccountChange = { userId: account.id }

            if (
                entry.permissions !== undefined &&
                !samePermissions(entry.permissions, account.permissions)
            ) {
                change.permissions = orderedPermissions(entry.permissions)
            }

            if (entry.active !== undefined && entry.active !== account.active) {
                change.active = entry.active
            }

            if (change.permissions === undefined && change.active === undefined) {
                return []
            }

            if (entry.reassignment !== undefined) {
                change.reassignment = toReassignment(entry.reassignment)
            }

            return [change]
        })

    return { changes }
}

export default buildAccountBatch
