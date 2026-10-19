import type AppointmentAction from "@/types/appointments/AppointmentAction.types"
import type AppointmentActionItemView from "@/types/appointments/AppointmentActionItemView.types"
import type AppointmentActionsView from "@/types/appointments/AppointmentActionsView.types"
import css from "@/styles/components/appointmentDetailSection.module.css"

type AppointmentActionsProps = {
    title: string
    view: AppointmentActionsView
    dateNote: string
    onAction: (action: AppointmentAction) => void
}

type ItemProps = {
    item: AppointmentActionItemView
    onAction: (action: AppointmentAction) => void
}

function buttonClass(action: AppointmentAction): string {
    return action === "no_show" ? `${css.action} ${css.actionWarning}` : css.action
}

function ActionItem({ item, onAction }: ItemProps) {
    if (item.kind === "waiting") {
        return <p className={css.box}>{item.text}</p>
    }

    return (
        <button
            type="button"
            className={buttonClass(item.action)}
            onClick={() => onAction(item.action)}
        >
            {item.label}
        </button>
    )
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
                <ActionItem key={`${item.kind}-${item.action}`} item={item} onAction={onAction} />
            ))}
            {view.finalText ? <p className={css.box}>{view.finalText}</p> : null}
            {view.readOnlyText ? <p className={css.box}>{view.readOnlyText}</p> : null}
            <p className={css.dateNote}>{dateNote}</p>
        </section>
    )
}

export default AppointmentActions
