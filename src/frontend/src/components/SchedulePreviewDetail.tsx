import { useTranslation } from "react-i18next"
import SchedulePreviewSlot from "@/components/SchedulePreviewSlot"
import type BookedDay from "@/types/schedule/BookedDay.types"
import type DayPreview from "@/types/schedule/DayPreview.types"
import formatDate from "@/utils/formatDate"
import WEEKDAY_KEYS from "@/utils/schedule/weekdayKeys"
import css from "@/styles/components/schedulePreview.module.css"

type SchedulePreviewDetailProps = {
    day: DayPreview
    booked: BookedDay | undefined
}

function SchedulePreviewDetail({ day, booked }: SchedulePreviewDetailProps) {
    const { t } = useTranslation("schedule")

    return (
        <div className={css.detail}>
            <div className={css.detailHeader}>
                <h3 className={css.detailTitle}>
                    {t("preview.detail.title", {
                        weekday: t(`weekdays.${WEEKDAY_KEYS[day.weekday]}`),
                        date: formatDate(day.date) ?? day.date
                    })}
                </h3>
                <span className={css.detailStatus}>
                    {t(`preview.detail.status.${day.status}`, {
                        description: day.blockDescription ?? ""
                    })}
                </span>
            </div>
            {day.slots.length > 0 ? (
                <ul className={css.slots}>
                    {day.slots.map((slot) => (
                        <SchedulePreviewSlot key={slot.time} slot={slot} />
                    ))}
                </ul>
            ) : (
                <p className={css.note}>{t("preview.detail.noSlots")}</p>
            )}
            {booked ? (
                <div className={css.bookedBlock}>
                    <h4 className={css.bookedTitle}>{t("preview.detail.bookedTitle")}</h4>
                    <ul className={css.bookedList}>
                        {booked.times.map(({ time, count }) => (
                            <li key={time}>{t("preview.detail.bookedTime", { time, count })}</li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </div>
    )
}

export default SchedulePreviewDetail
