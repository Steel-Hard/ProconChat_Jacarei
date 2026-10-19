import { useId } from "react"
import type AppointmentDocumentGroupView from "@/types/appointments/AppointmentDocumentGroupView.types"
import css from "@/styles/components/appointmentDetailSection.module.css"

type AppointmentDocumentGroupProps = {
    group: AppointmentDocumentGroupView
}

function AppointmentDocumentGroup({ group }: AppointmentDocumentGroupProps) {
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

export default AppointmentDocumentGroup
