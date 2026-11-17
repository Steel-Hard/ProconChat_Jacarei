import { useTranslation } from "react-i18next"
import type AppointmentCalendarData from "@/types/appointments/AppointmentCalendar.types"
import dayMonthOfDate from "@/utils/dayMonthOfDate"
import weekdayOf from "@/utils/weekdayOf"
import css from "@/styles/components/appointmentCalendar.module.css"

type Props = {
    date: string
    day: AppointmentCalendarData["days"][number] | undefined
    today: boolean
}

function AppointmentCalendarDayHeader({ date, day, today }: Props) {
    const { t } = useTranslation(["appointments", "common"])
    const weekday = weekdayOf(`${date}T12:00:00-03:00`)

    return (
        <th
            scope="col"
            className={today ? `${css.dayHeader} ${css.today}` : css.dayHeader}
            aria-current={today ? "date" : undefined}
        >
            {t("calendar.dayLabel", {
                weekday: t(`common:weekdays.short.${weekday}`),
                date: dayMonthOfDate(date)
            })}
            {day?.blocked.fullDay ? (
                <span className={css.blocked}>
                    {t("calendar.blocked.fullDay", {
                        description: day.blocked.description ?? t("calendar.fullDay")
                    })}
                </span>
            ) : null}
            {day && !day.blocked.fullDay && day.blocked.periods.length > 0 ? (
                <span className={css.blocked}>
                    {t("calendar.blocked.periods", {
                        periods: day.blocked.periods
                            .map((period) =>
                                t("calendar.blocked.period", {
                                    start: period.start,
                                    end: period.end
                                })
                            )
                            .join(", ")
                    })}
                </span>
            ) : null}
        </th>
    )
}

export default AppointmentCalendarDayHeader
