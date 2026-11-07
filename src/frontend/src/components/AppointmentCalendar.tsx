import type AppointmentCalendarData from "@/types/appointments/AppointmentCalendar.types"
import type AppointmentStatus from "@/types/status/AppointmentStatus.types"
import formatDate from "@/utils/formatDate"
import weekdayOf from "@/utils/weekdayOf"
import css from "@/styles/components/appointmentCalendar.module.css"

type Props = {
    data: AppointmentCalendarData
    labels: {
        week: string
        previous: string
        next: string
        current: string
        noDays: string
        fullDay: string
        freeSeats: string
        slots: string
        blockedPeriod: string
        offGrid: string
        openAppointment: string
        status: Record<AppointmentStatus, string>
        weekdays: Record<string, string>
    }
    onPrevious: () => void
    onNext: () => void
    onCurrent: () => void
    onOpen: (id: string) => void
}

function statusClass(status: AppointmentStatus): string {
    return `${css.status} ${css[`status${status}`]}`
}

function AppointmentCalendar({ data, labels, onPrevious, onNext, onCurrent, onOpen }: Props) {
    const weekLabel = labels.week
        .replace("{{start}}", formatDate(data.weekStart) ?? data.weekStart)
        .replace("{{end}}", formatDate(data.weekEnd) ?? data.weekEnd)

    return (
        <section className={css.calendar} aria-label={weekLabel}>
            <header className={css.toolbar}>
                <h2>{weekLabel}</h2>
                <div className={css.navigation}>
                    <button type="button" onClick={onPrevious}>
                        {labels.previous}
                    </button>
                    <button type="button" onClick={onCurrent}>
                        {labels.current}
                    </button>
                    <button type="button" onClick={onNext}>
                        {labels.next}
                    </button>
                </div>
            </header>
            {data.days.length === 0 ? (
                <p className={css.empty}>{labels.noDays}</p>
            ) : (
                <div className={css.days}>
                    {data.days.map((day) => {
                        const weekday = weekdayOf(`${day.date}T12:00:00-03:00`)
                        const appointments = data.appointments.filter(
                            (item) => item.date === day.date
                        )
                        const dayLabel = `${labels.weekdays[weekday] ?? weekday} · ${formatDate(day.date) ?? day.date}`

                        return (
                            <section className={css.day} key={day.date}>
                                <h3 className={css.dayTitle}>{dayLabel}</h3>
                                {day.blocked.fullDay ? (
                                    <p className={css.blocked}>
                                        {day.blocked.description ?? labels.fullDay}
                                    </p>
                                ) : null}
                                {day.blocked.periods.map((period) => {
                                    const periodLabel = `${labels.blockedPeriod} ${period.start}–${period.end}: ${period.description}`
                                    return (
                                        <p
                                            className={css.period}
                                            key={`${period.start}-${period.end}`}
                                        >
                                            {periodLabel}
                                        </p>
                                    )
                                })}
                                <div className={css.slots} aria-label={labels.slots}>
                                    {day.slots.map((slot) => (
                                        <span
                                            className={
                                                slot.freeSeats === null
                                                    ? css.unavailable
                                                    : css.available
                                            }
                                            key={slot.time}
                                        >
                                            {slot.time}
                                            {slot.freeSeats !== null
                                                ? ` · ${labels.freeSeats.replace("{{count}}", String(slot.freeSeats))}`
                                                : ""}
                                        </span>
                                    ))}
                                </div>
                                <ul className={css.appointments}>
                                    {appointments.map((appointment) => {
                                        const appointmentLabel = `${appointment.time} · ${appointment.shortName}`
                                        return (
                                            <li key={appointment.id}>
                                                <button
                                                    className={css.appointment}
                                                    type="button"
                                                    aria-label={labels.openAppointment
                                                        .replace("{{name}}", appointment.shortName)
                                                        .replace("{{time}}", appointment.time)}
                                                    onClick={() => onOpen(appointment.id)}
                                                >
                                                    <strong>{appointmentLabel}</strong>
                                                    <span>{appointment.protocol}</span>
                                                    <span
                                                        className={statusClass(appointment.status)}
                                                    >
                                                        {labels.status[appointment.status]}
                                                    </span>
                                                    {appointment.off_grid ? (
                                                        <span>{labels.offGrid}</span>
                                                    ) : null}
                                                </button>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </section>
                        )
                    })}
                </div>
            )}
        </section>
    )
}

export default AppointmentCalendar
