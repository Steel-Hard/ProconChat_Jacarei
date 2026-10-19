import AppointmentHistoryEntry from "@/components/AppointmentHistoryEntry"
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
                    <AppointmentHistoryEntry key={entry.id} entry={entry} />
                ))}
            </ol>
        </section>
    )
}

export default AppointmentHistory
