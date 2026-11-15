import { useTranslation } from "react-i18next"
import APPOINTMENT_STATUS_ORDER from "@/status/appointmentStatusOrder"
import APPOINTMENT_STATUS from "@/status/appointmentStatusStyles"
import css from "@/styles/components/appointmentCalendar.module.css"

type Props = {
    seatsPerSlot: number[]
}

function AppointmentCalendarLegend({ seatsPerSlot }: Props) {
    const { t } = useTranslation(["appointments", "common"])
    const seats = new Set(seatsPerSlot)
    const [only] = seats

    return (
        <div className={css.legend}>
            <ul className={css.legendStatuses} aria-label={t("calendar.legend.label")}>
                {APPOINTMENT_STATUS_ORDER.map((status) => (
                    <li key={status} className={css.legendStatus}>
                        <i
                            className={css.swatch}
                            style={{
                                backgroundColor: APPOINTMENT_STATUS[status].bg,
                                borderColor: APPOINTMENT_STATUS[status].border
                            }}
                            aria-hidden="true"
                        />
                        {t(`common:status.appointment.${status}`)}
                    </li>
                ))}
            </ul>
            <span>
                {seats.size === 1
                    ? t("calendar.legend.seats", { count: only })
                    : t("calendar.legend.freeSeatsOnly")}
            </span>
        </div>
    )
}

export default AppointmentCalendarLegend
