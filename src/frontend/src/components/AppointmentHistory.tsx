import AppointmentHistoryEntry from "@/components/AppointmentHistoryEntry"
import type AppointmentHistoryEntryView from "@/types/appointments/AppointmentHistoryEntryView.types"
import css from "@/styles/components/appointmentDetailSection.module.css"

type AppointmentHistoryProps = {
    title: string
    entries: AppointmentHistoryEntryView[]
    retry?: {
        allowed: boolean
        busy: boolean
        label: string
        error: string | null
        onRetry: () => void
    }
}

function AppointmentHistory({ title, entries, retry }: AppointmentHistoryProps) {
    const retryEntryId = entries.find((entry) => entry.highlight)?.id
    const hasFailureEntry = retryEntryId !== undefined

    return (
        <section className={`${css.section} ${css.side}`}>
            <h2 className={css.title}>{title}</h2>
            <ol className={css.history}>
                {entries.map((entry) => (
                    <AppointmentHistoryEntry
                        key={entry.id}
                        entry={entry}
                        retry={
                            retry?.allowed && entry.id === retryEntryId
                                ? {
                                      label: retry.label,
                                      busy: retry.busy,
                                      onClick: retry.onRetry
                                  }
                                : undefined
                        }
                    />
                ))}
            </ol>
            {retry?.allowed && !hasFailureEntry ? (
                <button
                    type="button"
                    className={css.action}
                    disabled={retry.busy}
                    aria-busy={retry.busy || undefined}
                    onClick={retry.onRetry}
                >
                    {retry.label}
                </button>
            ) : null}
            {retry?.error ? (
                <p role="alert" className={css.alert}>
                    {retry.error}
                </p>
            ) : null}
        </section>
    )
}

export default AppointmentHistory
