import AppointmentActionItem from "@/components/AppointmentActionItem"
import type AppointmentAction from "@/types/appointments/AppointmentAction.types"
import type AppointmentActionsView from "@/types/appointments/AppointmentActionsView.types"
import css from "@/styles/components/appointmentDetailSection.module.css"

type AppointmentActionsProps = {
    title: string
    view: AppointmentActionsView
    dateNote: string
    onAction: (action: AppointmentAction) => void
}

function AppointmentActions({ title, view, dateNote, onAction }: AppointmentActionsProps) {
    return (
        <section className={`${css.section} ${css.side}`}>
            <h2 className={css.title}>{title}</h2>
            {view.error ? (
                <p role="alert" className={css.alert}>
                    {view.error}
                </p>
            ) : null}
            {view.items.map((item) => (
                <AppointmentActionItem
                    key={`${item.kind}-${item.action}`}
                    item={item}
                    onAction={onAction}
                />
            ))}
            {view.finalText ? <p className={css.box}>{view.finalText}</p> : null}
            {view.readOnlyText ? <p className={css.box}>{view.readOnlyText}</p> : null}
            <p className={css.dateNote}>{dateNote}</p>
        </section>
    )
}

export default AppointmentActions
