import PERMISSION_KEYS from "@/navigation/permissionKeys"
import type DraftChangeTexts from "@/types/users/DraftChangeTexts.types"
import type UserAccount from "@/types/users/UserAccount.types"
import type UserDraft from "@/types/users/UserDraft.types"
import type UserDraftEntry from "@/types/users/UserDraftEntry.types"

function accountChanges(
    account: UserAccount,
    entry: UserDraftEntry,
    texts: DraftChangeTexts
): string[] {
    const items: string[] = []

    if (entry.active !== undefined && entry.active !== account.active) {
        items.push(entry.active ? texts.reactivate(account.name) : texts.deactivate(account.name))
    }

    const next = entry.permissions

    if (next === undefined) {
        return items
    }

    for (const key of PERMISSION_KEYS) {
        const had = account.permissions.includes(key)
        const has = next.includes(key)

        if (had !== has) {
            const permission = texts.permissionName(key)
            items.push(
                has ? texts.grant(account.name, permission) : texts.revoke(account.name, permission)
            )
        }
    }

    return items
}

function draftChangeList(
    accounts: UserAccount[],
    draft: UserDraft,
    texts: DraftChangeTexts
): string[] {
    const items = accounts.flatMap((account) => {
        const entry = draft[account.id]

        return entry === undefined ? [] : accountChanges(account, entry, texts)
    })
    const redistributed = Object.values(draft).reduce(
        (total, entry) => total + (entry.reassignment?.count ?? 0),
        0
    )

    return redistributed > 0 ? [...items, texts.redistributed(redistributed)] : items
}

export default draftChangeList
