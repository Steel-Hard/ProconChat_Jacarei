import type AppointmentHistoryEntryView from "@/types/appointments/AppointmentHistoryEntryView.types"
import css from "@/styles/components/appointmentDetailSection.module.css"

type AppointmentHistoryProps = {
    title: string
    entries: AppointmentHistoryEntryView[]
}

function AppointmentHistory({ title, entries }: AppointmentHistoryProps) {
    return (
        <section className={`${css.section} ${css.side}`}>
            <h2 className={css.title}>{title}</h2>
            <ol className={css.history}>
                {entries.map((entry) => (
                    <li
                        key={entry.id}
                        className={entry.highlight ? `${css.entry} ${css.failed}` : css.entry}
                        data-highlight={entry.highlight || undefined}
                    >
                        <span className={css.entryText}>{entry.text}</span>
                        <span className={css.entryWhen}>{entry.when}</span>
                    </li>
                ))}
            </ol>
        </section>
    )
}

export default AppointmentHistory
