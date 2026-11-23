import { useTranslation } from "react-i18next"
import type WeekdayPreview from "@/types/schedule/WeekdayPreview.types"
import WEEKDAY_KEYS from "@/utils/schedule/weekdayKeys"
import css from "@/styles/components/schedulePreview.module.css"

type SchedulePreviewWeekdayProps = {
    weekday: number
    summary: WeekdayPreview | undefined
}

function SchedulePreviewWeekday({ weekday, summary }: SchedulePreviewWeekdayProps) {
    const { t } = useTranslation("schedule")
    const open = summary !== undefined && summary.totalSlots > 0

    return (
        <li className={css.weekdayRow}>
            <span className={css.weekdayName}>{t(`weekdays.${WEEKDAY_KEYS[weekday]}`)}</span>
            <span className={css.weekdayTimes}>
                {open
                    ? t("preview.weekdaySummary.totals", {
                          slots: summary.totalSlots,
                          seats: summary.totalSeats,
                          times: summary.slots.join(", ")
                      })
                    : t("preview.weekdaySummary.closed")}
            </span>
        </li>
    )
}

export default SchedulePreviewWeekday
