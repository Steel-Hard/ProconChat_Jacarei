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
            data-muted={entry.muted || undefined}
        >
            <span className={entry.muted ? `${css.entryText} ${css.entryMuted}` : css.entryText}>
                {entry.text}
            </span>
            {entry.detail ? <span className={css.entryDetail}>{entry.detail}</span> : null}
            <span className={css.entryWhen}>{entry.when}</span>
            {retry ? (
                <button
                    type="button"
                    className={css.entryRetry}
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
