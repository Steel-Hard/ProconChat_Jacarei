import { useTranslation } from "react-i18next"
import AppointmentCalendarCard from "@/components/AppointmentCalendarCard"
import type AppointmentCalendarData from "@/types/appointments/AppointmentCalendar.types"
import css from "@/styles/components/appointmentCalendar.module.css"

type Props = {
    slot: AppointmentCalendarData["days"][number]["slots"][number] | undefined
    appointments: AppointmentCalendarData["appointments"]
    onOpen: (id: string) => void
}

function cellClass(slot: Props["slot"]): string {
    if (!slot) {
        return `${css.cell} ${css.closed}`
    }

    return slot.freeSeats === null ? `${css.cell} ${css.unavailable}` : css.cell
}

function AppointmentCalendarCell({ slot, appointments, onOpen }: Props) {
    const { t } = useTranslation("appointments")

    return (
        <td className={cellClass(slot)}>
            {appointments.map((appointment) => (
                <AppointmentCalendarCard
                    key={appointment.id}
                    appointment={appointment}
                    onOpen={onOpen}
                />
            ))}
            {slot && slot.freeSeats !== null && slot.freeSeats > 0 ? (
                <span className={css.freeSeats}>
                    {t("calendar.freeSeats", { count: slot.freeSeats })}
                </span>
            ) : null}
        </td>
    )
}

export default AppointmentCalendarCell
