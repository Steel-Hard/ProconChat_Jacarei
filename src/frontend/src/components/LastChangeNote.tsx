import { useTranslation } from "react-i18next"
import type LastChange from "@/types/settings/LastChange.types"
import formatDate from "@/utils/formatDate"
import css from "@/styles/components/lastChangeNote.module.css"

type LastChangeNoteProps = {
    change: LastChange | null
}

function LastChangeNote({ change }: LastChangeNoteProps) {
    const { t } = useTranslation()

    if (change === null) {
        return null
    }

    const date = formatDate(change.changedAt)

    if (date === null) {
        return null
    }

    return (
        <p className={css.note}>
            {t("lastChangeNote.text", { name: change.changedBy.trim(), date })}
        </p>
    )
}

export default LastChangeNote
