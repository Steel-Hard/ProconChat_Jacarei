import UserAccountRow from "@/components/UserAccountRow"
import type UserAccountRowTexts from "@/types/users/UserAccountRowTexts.types"
import type UserAccountRowView from "@/types/users/UserAccountRowView.types"
import css from "@/styles/components/userAccountList.module.css"

type UserAccountListProps = {
    label: string
    rows: UserAccountRowView[]
    texts: UserAccountRowTexts
    onSelect: (id: number) => void
}

function UserAccountList({ label, rows, texts, onSelect }: UserAccountListProps) {
    return (
        <ul className={css.list} aria-label={label}>
            {rows.map((row) => (
                <li key={row.id} className={css.item}>
                    <UserAccountRow row={row} texts={texts} onSelect={onSelect} />
                </li>
            ))}
        </ul>
    )
}

export default UserAccountList
