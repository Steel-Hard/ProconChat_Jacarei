import type UserAccount from "@/types/users/UserAccount.types"
import type UserDraft from "@/types/users/UserDraft.types"
import type UserDraftEntry from "@/types/users/UserDraftEntry.types"
import samePermissions from "@/utils/users/samePermissions"

function updateDraftEntry(draft: UserDraft, saved: UserAccount, change: UserDraftEntry): UserDraft {
    const merged: UserDraftEntry = { ...draft[saved.id], ...change }
    const entry: UserDraftEntry = {}

    if (
        merged.permissions !== undefined &&
        !samePermissions(merged.permissions, saved.permissions)
    ) {
        entry.permissions = merged.permissions
    }

    if (merged.active !== undefined && merged.active !== saved.active) {
        entry.active = merged.active
    }

    const next = { ...draft }
    delete next[saved.id]

    if (entry.permissions === undefined && entry.active === undefined) {
        return next
    }

    if (merged.reassignment !== undefined) {
        entry.reassignment = merged.reassignment
    }

    return { ...next, [saved.id]: entry }
}

export default updateDraftEntry
