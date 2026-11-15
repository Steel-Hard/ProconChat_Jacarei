import { useTranslation } from "react-i18next"
import type AppointmentCalendarData from "@/types/appointments/AppointmentCalendar.types"
import css from "@/styles/components/appointmentCalendar.module.css"

type Props = {
    appointment: AppointmentCalendarData["appointments"][number]
    onOpen: (id: string) => void
}

function AppointmentCalendarCard({ appointment, onOpen }: Props) {
    const { t } = useTranslation("appointments")

    return (
        <button
            type="button"
            className={css.card}
            aria-label={t("calendar.openAppointment", {
                name: appointment.shortName,
                time: appointment.time
            })}
            onClick={() => onOpen(appointment.id)}
        >
            <span className={css.protocol}>{appointment.protocol}</span>
            <span className={css.name}>{appointment.shortName}</span>
            {appointment.off_grid ? <span>{t("calendar.offGrid")}</span> : null}
        </button>
    )
}

export default AppointmentCalendarCard
