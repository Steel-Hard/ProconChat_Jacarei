import PERMISSION_KEYS from "@/navigation/permissionKeys"
import type DraftChangeTexts from "@/types/users/DraftChangeTexts.types"
import type UserAccount from "@/types/users/UserAccount.types"
import type UserDraft from "@/types/users/UserDraft.types"
import type UserDraftEntry from "@/types/users/UserDraftEntry.types"

type ChangeLine = { key: string; text: string }

const MANAGE = "appointments.manage"

function accountLines(
    account: UserAccount,
    entry: UserDraftEntry,
    texts: DraftChangeTexts
): ChangeLine[] {
    const lines: ChangeLine[] = []

    if (entry.active !== undefined && entry.active !== account.active) {
        lines.push({
            key: "active",
            text: entry.active ? texts.reactivate(account.name) : texts.deactivate(account.name)
        })
    }

    const next = entry.permissions

    if (next === undefined) {
        return lines
    }

    for (const key of PERMISSION_KEYS) {
        const had = account.permissions.includes(key)
        const has = next.includes(key)

        if (had !== has) {
            const permission = texts.permissionName(key)
            lines.push({
                key,
                text: has
                    ? texts.grant(account.name, permission)
                    : texts.revoke(account.name, permission)
            })
        }
    }

    return lines
}

function accountChanges(
    account: UserAccount,
    entry: UserDraftEntry,
    texts: DraftChangeTexts
): string[] {
    const lines = accountLines(account, entry, texts)
    const reassignment = entry.reassignment

    if (reassignment === undefined || reassignment.count === 0) {
        return lines.map((line) => line.text)
    }

    const anchor = reassignment.reason === "deactivate" ? "active" : MANAGE
    const index = Math.max(
        lines.findIndex((line) => line.key === anchor),
        0
    )

    return lines.map((line, position) =>
        position === index ? texts.redistributed(line.text, reassignment.count) : line.text
    )
}

function draftChangeList(
    accounts: UserAccount[],
    draft: UserDraft,
    texts: DraftChangeTexts
): string[] {
    return accounts.flatMap((account) => {
        const entry = draft[account.id]

        return entry === undefined ? [] : accountChanges(account, entry, texts)
    })
}

export default draftChangeList
