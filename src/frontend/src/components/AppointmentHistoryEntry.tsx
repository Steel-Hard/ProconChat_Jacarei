import type AppointmentHistoryEntryView from "@/types/appointments/AppointmentHistoryEntryView.types"
import css from "@/styles/components/appointmentDetailSection.module.css"

type AppointmentHistoryEntryProps = {
    entry: AppointmentHistoryEntryView
}

function AppointmentHistoryEntry({ entry }: AppointmentHistoryEntryProps) {
    return (
        <li
            className={entry.highlight ? `${css.entry} ${css.failed}` : css.entry}
            data-highlight={entry.highlight || undefined}
        >
            <span className={css.entryText}>{entry.text}</span>
            <span className={css.entryWhen}>{entry.when}</span>
        </li>
    )
}

export default AppointmentHistoryEntry
