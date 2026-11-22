import { useTranslation } from "react-i18next"
import Seal from "@/components/Seal"
import APPOINTMENT_STATUS from "@/status/appointmentStatusStyles"
import type ScheduleConflict from "@/types/schedule/ScheduleConflict.types"
import dayMonthOf from "@/utils/schedule/dayMonthOf"
import weekdayOfDate from "@/utils/schedule/weekdayOfDate"
import WEEKDAY_KEYS from "@/utils/schedule/weekdayKeys"
import css from "@/styles/components/scheduleConflictModalRow.module.css"

type ScheduleConflictModalRowProps = {
    conflict: ScheduleConflict
}

function ScheduleConflictModalRow({ conflict }: ScheduleConflictModalRowProps) {
    const { t } = useTranslation(["schedule", "common"])
    const statusStyle = APPOINTMENT_STATUS[conflict.status]

    return (
        <li className={css.row}>
            <span className={css.protocol}>{conflict.protocol}</span>
            <div className={css.details}>
                <div className={css.identity}>
                    <span className={css.name}>{conflict.name}</span>
                    <Seal
                        label={t(`common:status.appointment.${conflict.status}`)}
                        colors={statusStyle}
                    />
                </div>
                <div className={css.when}>
                    {t("conflicts.when", {
                        weekday: t(`weekdays.${WEEKDAY_KEYS[weekdayOfDate(conflict.date)]}`),
                        date: dayMonthOf(conflict.date),
                        time: conflict.time
                    })}
                </div>
                <div className={css.reason}>{conflict.reason}</div>
            </div>
        </li>
    )
}

export default ScheduleConflictModalRow
