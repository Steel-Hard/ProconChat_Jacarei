import type UserAccount from "@/types/users/UserAccount.types"
import type UserDraft from "@/types/users/UserDraft.types"

function effectiveAccounts(accounts: UserAccount[], draft: UserDraft): UserAccount[] {
    return accounts.map((account) => {
        const entry = draft[account.id]

        if (entry === undefined) {
            return account
        }

        return {
            ...account,
            permissions: entry.permissions ?? account.permissions,
            active: entry.active ?? account.active
        }
    })
}

export default effectiveAccounts
