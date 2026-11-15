import { useTranslation } from "react-i18next"
import type AppointmentCalendarData from "@/types/appointments/AppointmentCalendar.types"
import dayMonthOfDate from "@/utils/dayMonthOfDate"
import weekdayOf from "@/utils/weekdayOf"
import css from "@/styles/components/appointmentCalendar.module.css"

type Props = {
    date: string
    day: AppointmentCalendarData["days"][number] | undefined
}

function AppointmentCalendarDayHeader({ date, day }: Props) {
    const { t } = useTranslation(["appointments", "common"])
    const weekday = weekdayOf(`${date}T12:00:00-03:00`)

    return (
        <th scope="col" className={css.dayHeader}>
            {t("calendar.dayLabel", {
                weekday: t(`common:weekdays.short.${weekday}`),
                date: dayMonthOfDate(date)
            })}
            {day?.blocked.fullDay ? (
                <span className={css.blocked}>
                    {day.blocked.description ?? t("calendar.fullDay")}
                </span>
            ) : null}
            {day?.blocked.periods.map((period) => (
                <span className={css.blocked} key={`${period.start}-${period.end}`}>
                    {t("calendar.blockedPeriod", {
                        start: period.start,
                        end: period.end,
                        description: period.description
                    })}
                </span>
            ))}
        </th>
    )
}

export default AppointmentCalendarDayHeader
