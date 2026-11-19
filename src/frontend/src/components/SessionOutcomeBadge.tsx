import type { CSSProperties } from "react"
import CONVERSATION_OUTCOME from "@/status/conversationOutcomeStyles"
import type { SessionOutcome } from "@/types/sessions/Session.types"
import css from "@/styles/pages/sessions.module.css"

type SessionOutcomeBadgeProps = {
    outcome: SessionOutcome
    label: string
    small?: boolean
}

function SessionOutcomeBadge({ outcome, label, small = false }: SessionOutcomeBadgeProps) {
    const style = CONVERSATION_OUTCOME[outcome]

    return (
        <span
            className={small ? `${css.badge} ${css.badgeSmall}` : css.badge}
            style={{ background: style.bg, color: style.fg } as CSSProperties}
        >
            {label}
        </span>
    )
}

export default SessionOutcomeBadge
