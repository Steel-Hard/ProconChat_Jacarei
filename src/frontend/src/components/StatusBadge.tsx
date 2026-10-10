import {
    APPOINTMENT_STATUS,
    CONVERSATION_OUTCOME,
    type AppointmentStatus,
    type ConversationOutcome
} from "@/components/statusStyles"
import css from "@/styles/components/statusBadge.module.css"

type StatusBadgeProps =
    | { kind: "appointment"; status: AppointmentStatus }
    | { kind: "outcome"; status: ConversationOutcome }

function StatusBadge(props: StatusBadgeProps) {
    const style =
        props.kind === "appointment"
            ? APPOINTMENT_STATUS[props.status]
            : CONVERSATION_OUTCOME[props.status]

    return (
        <span className={css.badge} style={{ backgroundColor: style.bg, color: style.fg }}>
            {style.label}
        </span>
    )
}

export default StatusBadge
