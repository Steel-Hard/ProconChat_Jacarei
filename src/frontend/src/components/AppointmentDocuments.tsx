import AppointmentDocumentGroup from "@/components/AppointmentDocumentGroup"
import type AppointmentDocumentGroupView from "@/types/appointments/AppointmentDocumentGroupView.types"
import css from "@/styles/components/appointmentDetailSection.module.css"

type AppointmentDocumentsProps = {
    title: string
    note: string
    configNotice: string | null
    groups: AppointmentDocumentGroupView[]
}

function AppointmentDocuments({ title, note, configNotice, groups }: AppointmentDocumentsProps) {
    return (
        <section className={css.section}>
            <h2 className={css.title}>{title}</h2>
            <p className={css.lead}>{note}</p>
            {configNotice ? <p className={css.warning}>{configNotice}</p> : null}
            <div className={css.groups}>
                {groups.map((group) => (
                    <AppointmentDocumentGroup key={group.title} group={group} />
                ))}
            </div>
        </section>
    )
}

export default AppointmentDocuments
