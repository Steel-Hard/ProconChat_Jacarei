import { useTranslation } from "react-i18next"
import Seal from "@/components/Seal"
import APPOINTMENT_STATUS from "@/status/appointmentStatusStyles"
import type AppointmentCalendarData from "@/types/appointments/AppointmentCalendar.types"
import css from "@/styles/components/appointmentCalendar.module.css"

type Props = {
    appointment: AppointmentCalendarData["appointments"][number]
    onOpen: (id: string) => void
}

function AppointmentCalendarCard({ appointment, onOpen }: Props) {
    const { t } = useTranslation(["appointments", "common"])
    const colors = APPOINTMENT_STATUS[appointment.status]
    const active = appointment.status === "PENDING" || appointment.status === "CONFIRMED"

    return (
        <button
            type="button"
            className={css.card}
            style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.fg }}
            aria-label={t("calendar.openAppointment", {
                name: appointment.shortName,
                time: appointment.time,
                status: t(`common:status.appointment.${appointment.status}`)
            })}
            onClick={() => onOpen(appointment.id)}
        >
            <span className={css.protocol}>{appointment.protocol}</span>
            <span
                className={
                    appointment.status === "CANCELED" ? `${css.name} ${css.canceled}` : css.name
                }
            >
                {appointment.shortName}
            </span>
            {appointment.off_grid && active ? (
                <Seal label={t("row.offGrid")} tone="warning" />
            ) : null}
        </button>
    )
}

export default AppointmentCalendarCard
