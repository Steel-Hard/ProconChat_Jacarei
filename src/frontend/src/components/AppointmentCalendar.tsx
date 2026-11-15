import { useTranslation } from "react-i18next"
import AppointmentCalendarCell from "@/components/AppointmentCalendarCell"
import AppointmentCalendarDayHeader from "@/components/AppointmentCalendarDayHeader"
import AppointmentCalendarToolbar from "@/components/AppointmentCalendarToolbar"
import type AppointmentCalendarData from "@/types/appointments/AppointmentCalendar.types"
import appointmentCalendarGrid from "@/utils/appointmentCalendarGrid"
import dayMonthOfDate from "@/utils/dayMonthOfDate"
import formatDate from "@/utils/formatDate"
import todayInSaoPaulo from "@/utils/schedule/todayInSaoPaulo"
import css from "@/styles/components/appointmentCalendar.module.css"

type Props = {
    data: AppointmentCalendarData
    onPrevious: () => void
    onNext: () => void
    onCurrent: () => void
    onOpen: (id: string) => void
}

function AppointmentCalendar({ data, onPrevious, onNext, onCurrent, onOpen }: Props) {
    const { t } = useTranslation(["appointments", "common"])
    const weekLabel = t("calendar.week", {
        start: dayMonthOfDate(data.weekStart),
        end: formatDate(data.weekEnd) ?? data.weekEnd
    })
    const grid = appointmentCalendarGrid(data)
    const today = todayInSaoPaulo()
    const dayByDate = new Map(data.days.map((day) => [day.date, day]))

    return (
        <section className={css.calendar}>
            <AppointmentCalendarToolbar
                weekLabel={weekLabel}
                seatsPerSlot={data.days.map((day) => day.seatsPerSlot)}
                onPrevious={onPrevious}
                onNext={onNext}
                onCurrent={onCurrent}
            />
            {grid.dates.length === 0 ? (
                <p className={css.empty}>{t("calendar.noDays")}</p>
            ) : (
                <div className={css.scroll}>
                    <table className={css.grid}>
                        <caption className={css.visuallyHidden}>{weekLabel}</caption>
                        <thead>
                            <tr>
                                <td className={css.corner} aria-hidden="true" />
                                {grid.dates.map((date) => (
                                    <AppointmentCalendarDayHeader
                                        key={date}
                                        date={date}
                                        day={dayByDate.get(date)}
                                        today={date === today}
                                    />
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {grid.times.map((time) => (
                                <tr key={time}>
                                    <th scope="row" className={css.hour}>
                                        {time}
                                    </th>
                                    {grid.dates.map((date) => (
                                        <AppointmentCalendarCell
                                            key={date}
                                            slot={dayByDate
                                                .get(date)
                                                ?.slots.find((slot) => slot.time === time)}
                                            appointments={data.appointments.filter(
                                                (appointment) =>
                                                    appointment.date === date &&
                                                    appointment.time === time
                                            )}
                                            onOpen={onOpen}
                                        />
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    )
}

export default AppointmentCalendar
