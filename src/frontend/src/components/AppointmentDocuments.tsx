import { useId } from "react"
import type AppointmentDocumentGroupView from "@/types/appointments/AppointmentDocumentGroupView.types"
import css from "@/styles/components/appointmentDetailSection.module.css"

type AppointmentDocumentsProps = {
    title: string
    note: string
    configNotice: string | null
    groups: AppointmentDocumentGroupView[]
}

type GroupProps = {
    group: AppointmentDocumentGroupView
}

function DocumentGroup({ group }: GroupProps) {
    const titleId = useId()

    return (
        <div>
            <p id={titleId} className={css.groupTitle}>
                {group.title}
            </p>
            {group.items.length > 0 ? (
                <ul className={css.documents} aria-labelledby={titleId}>
                    {group.items.map((item) => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>
            ) : (
                <p className={css.muted}>{group.emptyText}</p>
            )}
        </div>
    )
}

function AppointmentDocuments({ title, note, configNotice, groups }: AppointmentDocumentsProps) {
    return (
        <section className={css.section}>
            <h2 className={css.title}>{title}</h2>
            <p className={css.lead}>{note}</p>
            {configNotice ? <p className={css.warning}>{configNotice}</p> : null}
            <div className={css.groups}>
                {groups.map((group) => (
                    <DocumentGroup key={group.title} group={group} />
                ))}
            </div>
        </section>
    )
}

export default AppointmentDocuments
