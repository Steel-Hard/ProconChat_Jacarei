import type { MouseEvent } from "react"
import css from "@/styles/components/appointmentTable.module.css"

type AppointmentClaimButtonProps = {
    label: string
    disabled: boolean
    onClaim: () => void
}

function AppointmentClaimButton({ label, disabled, onClaim }: AppointmentClaimButtonProps) {
    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        event.stopPropagation()
        onClaim()
    }

    return (
        <button type="button" className={css.claim} disabled={disabled} onClick={handleClick}>
            {label}
        </button>
    )
}

export default AppointmentClaimButton
