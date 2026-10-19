import type AppointmentAction from "@/types/appointments/AppointmentAction.types"
import type AppointmentActionItemView from "@/types/appointments/AppointmentActionItemView.types"
import css from "@/styles/components/appointmentDetailSection.module.css"

type AppointmentActionItemProps = {
    item: AppointmentActionItemView
    onAction: (action: AppointmentAction) => void
}

function buttonClass(action: AppointmentAction): string {
    return action === "no_show" ? `${css.action} ${css.actionWarning}` : css.action
}

function AppointmentActionItem({ item, onAction }: AppointmentActionItemProps) {
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

export default AppointmentActionItem
