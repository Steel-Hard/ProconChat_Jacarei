import { useTranslation } from "react-i18next"
import StatusBadge from "@/components/StatusBadge"
import type ScheduleConflictRowView from "@/types/schedule/ScheduleConflictRowView.types"
import dayMonthOf from "@/utils/schedule/dayMonthOf"
import weekdayOfDate from "@/utils/schedule/weekdayOfDate"
import WEEKDAY_KEYS from "@/utils/schedule/weekdayKeys"
import css from "@/styles/components/scheduleConflictList.module.css"

type ScheduleConflictRowProps = {
    conflict: ScheduleConflictRowView
}

function ScheduleConflictRow({ conflict }: ScheduleConflictRowProps) {
    const { t } = useTranslation("schedule")

    return (
        <li className={css.row}>
            <div className={css.who}>
                <span className={css.protocol}>
                    {t("conflicts.protocol", { protocol: conflict.protocol })}
                </span>
                {conflict.name ? <span className={css.name}>{conflict.name}</span> : null}
                {conflict.cpfMasked ? <span className={css.cpf}>{conflict.cpfMasked}</span> : null}
            </div>
            <div className={css.when}>
                {t("conflicts.when", {
                    weekday: t(`weekdays.${WEEKDAY_KEYS[weekdayOfDate(conflict.date)]}`),
                    date: dayMonthOf(conflict.date),
                    time: conflict.time
                })}
            </div>
            <StatusBadge kind="appointment" status={conflict.status} />
            <p className={css.reason}>{conflict.reason}</p>
        </li>
    )
}

export default ScheduleConflictRow
