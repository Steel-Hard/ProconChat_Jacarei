import type AppointmentHistoryEntryView from "@/types/appointments/AppointmentHistoryEntryView.types"
import css from "@/styles/components/appointmentDetailSection.module.css"

type AppointmentHistoryEntryProps = {
    entry: AppointmentHistoryEntryView
    retry?: { label: string; busy: boolean; onClick: () => void }
}

function AppointmentHistoryEntry({ entry, retry }: AppointmentHistoryEntryProps) {
    return (
        <li
            className={entry.highlight ? `${css.entry} ${css.failed}` : css.entry}
            data-highlight={entry.highlight || undefined}
        >
            <span className={css.entryText}>{entry.text}</span>
            <span className={css.entryWhen}>{entry.when}</span>
            {retry ? (
                <button
                    type="button"
                    className={css.action}
                    disabled={retry.busy}
                    aria-busy={retry.busy || undefined}
                    onClick={retry.onClick}
                >
                    {retry.label}
                </button>
            ) : null}
        </li>
    )
}

export default AppointmentHistoryEntry
