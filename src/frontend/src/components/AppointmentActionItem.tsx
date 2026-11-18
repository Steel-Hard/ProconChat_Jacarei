import type AppointmentAction from "@/types/appointments/AppointmentAction.types"
import type AppointmentActionItemView from "@/types/appointments/AppointmentActionItemView.types"
import css from "@/styles/components/appointmentDetailSection.module.css"

type AppointmentActionItemProps = {
    item: AppointmentActionItemView
    onAction: (action: AppointmentAction) => void
}

const VARIANT: Partial<Record<AppointmentAction, string>> = {
    no_show: css.attention,
    cancel: css.danger,
    assign: css.secondary,
    correct_record: css.secondary
}

function buttonClass(action: AppointmentAction): string {
    return `${css.action} ${VARIANT[action] ?? ""}`.trim()
}

function AppointmentActionItem({ item, onAction }: AppointmentActionItemProps) {
    if (item.kind === "waiting") {
        return <p className={css.box}>{item.text}</p>
    }

    return (
        <>
            <button
                type="button"
                className={buttonClass(item.action)}
                onClick={() => onAction(item.action)}
            >
                {item.label}
            </button>
            {item.hint ? <p className={css.hint}>{item.hint}</p> : null}
        </>
    )
}

export default AppointmentActionItem
