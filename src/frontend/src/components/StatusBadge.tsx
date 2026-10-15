import { useTranslation } from "react-i18next"
import APPOINTMENT_STATUS from "@/status/appointmentStatusStyles"
import CONVERSATION_OUTCOME from "@/status/conversationOutcomeStyles"
import WHATSAPP_STATUS from "@/status/whatsappStatusStyles"
import type AppointmentStatus from "@/types/status/AppointmentStatus.types"
import type ConversationOutcome from "@/types/status/ConversationOutcome.types"
import type WhatsAppStatus from "@/types/status/WhatsAppStatus.types"
import css from "@/styles/components/statusBadge.module.css"

type StatusBadgeProps =
    | { kind: "appointment"; status: AppointmentStatus }
    | { kind: "outcome"; status: ConversationOutcome }
    | { kind: "whatsapp"; status: WhatsAppStatus }

function useBadge(props: StatusBadgeProps): { bg: string; fg: string; label: string } {
    const { t } = useTranslation()

    if (props.kind === "appointment") {
        return {
            ...APPOINTMENT_STATUS[props.status],
            label: t(`status.appointment.${props.status}`)
        }
    }

    if (props.kind === "outcome") {
        return { ...CONVERSATION_OUTCOME[props.status], label: t(`status.outcome.${props.status}`) }
    }

    return { ...WHATSAPP_STATUS[props.status], label: t(`status.whatsapp.${props.status}`) }
}

function StatusBadge(props: StatusBadgeProps) {
    const badge = useBadge(props)

    return (
        <span className={css.badge} style={{ backgroundColor: badge.bg, color: badge.fg }}>
            {badge.label}
        </span>
    )
}

export default StatusBadge
