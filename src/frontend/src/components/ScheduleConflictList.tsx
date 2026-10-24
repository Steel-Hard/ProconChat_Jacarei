import { useId } from "react"
import { useTranslation } from "react-i18next"
import ScheduleConflictRow from "@/components/ScheduleConflictRow"
import type ScheduleConflictRowView from "@/types/schedule/ScheduleConflictRowView.types"
import css from "@/styles/components/scheduleConflictList.module.css"

type ScheduleConflictListProps = {
    conflicts: ScheduleConflictRowView[]
}

function ScheduleConflictList({ conflicts }: ScheduleConflictListProps) {
    const { t } = useTranslation("schedule")
    const titleId = useId()

    return (
        <section className={css.list} aria-labelledby={titleId}>
            <h2 id={titleId} className={css.title}>
                {t("conflicts.title", { count: conflicts.length })}
            </h2>
            <p className={css.hint}>{t("conflicts.hint")}</p>
            <ul className={css.rows}>
                {conflicts.map((conflict) => (
                    <ScheduleConflictRow
                        key={`${conflict.protocol}-${conflict.code}`}
                        conflict={conflict}
                    />
                ))}
            </ul>
        </section>
    )
}

export default ScheduleConflictList
