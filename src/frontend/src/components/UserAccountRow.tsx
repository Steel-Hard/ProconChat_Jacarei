import type UserAccountRowTexts from "@/types/users/UserAccountRowTexts.types"
import type UserAccountRowView from "@/types/users/UserAccountRowView.types"
import css from "@/styles/components/userAccountRow.module.css"

type UserAccountRowProps = {
    row: UserAccountRowView
    texts: UserAccountRowTexts
    onSelect: (id: number) => void
}

function UserAccountRow({ row, texts, onSelect }: UserAccountRowProps) {
    return (
        <button
            type="button"
            className={row.selected ? `${css.row} ${css.selected}` : css.row}
            aria-pressed={row.selected}
            onClick={() => onSelect(row.id)}
        >
            <span className={css.avatar} aria-hidden="true">
                {row.initials}
            </span>
            <span className={css.identity}>
                <span className={css.name}>
                    {row.name}
                    {row.isAdmin ? <span className={css.admin}>{texts.admin}</span> : null}
                </span>
                <span className={css.summary}>{row.summary}</span>
                {row.lastLogin ? <span className={css.lastLogin}>{row.lastLogin}</span> : null}
            </span>
            <span className={css.state}>
                <span className={row.active ? css.active : css.inactive}>{row.statusLabel}</span>
                {row.unsaved ? <span className={css.unsaved}>{texts.unsaved}</span> : null}
            </span>
        </button>
    )
}

export default UserAccountRow
