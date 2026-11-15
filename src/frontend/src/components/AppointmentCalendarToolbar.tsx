import { useTranslation } from "react-i18next"
import AppointmentCalendarLegend from "@/components/AppointmentCalendarLegend"
import css from "@/styles/components/appointmentCalendar.module.css"

type Props = {
    weekLabel: string
    seatsPerSlot: number[]
    onPrevious: () => void
    onNext: () => void
    onCurrent: () => void
}

function AppointmentCalendarToolbar({
    weekLabel,
    seatsPerSlot,
    onPrevious,
    onNext,
    onCurrent
}: Props) {
    const { t } = useTranslation("appointments")

    return (
        <header className={css.toolbar}>
            <div className={css.navigation}>
                <button
                    type="button"
                    className={css.iconButton}
                    aria-label={t("calendar.previous")}
                    onClick={onPrevious}
                >
                    <span aria-hidden="true">{t("calendar.previousIcon")}</span>
                </button>
                <button
                    type="button"
                    className={css.iconButton}
                    aria-label={t("calendar.next")}
                    onClick={onNext}
                >
                    <span aria-hidden="true">{t("calendar.nextIcon")}</span>
                </button>
                <h2 className={css.weekLabel}>{weekLabel}</h2>
                <button type="button" className={css.currentButton} onClick={onCurrent}>
                    {t("calendar.current")}
                </button>
            </div>
            <AppointmentCalendarLegend seatsPerSlot={seatsPerSlot} />
        </header>
    )
}

export default AppointmentCalendarToolbar
