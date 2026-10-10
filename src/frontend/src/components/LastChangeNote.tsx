import type LastChange from "@/types/settings/LastChange.types"
import formatDate from "@/utils/formatDate"
import css from "@/styles/components/lastChangeNote.module.css"

type LastChangeNoteProps = {
    change: LastChange | null
}

function LastChangeNote({ change }: LastChangeNoteProps) {
    if (change === null) {
        return null
    }

    const date = formatDate(change.changedAt)

    if (date === null) {
        return null
    }

    return (
        <p className={css.note}>{`Última alteração por ${change.changedBy.trim()} em ${date}`}</p>
    )
}

export default LastChangeNote
