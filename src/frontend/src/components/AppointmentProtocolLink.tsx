import type { MouseEvent } from "react"
import { Link } from "react-router-dom"
import type AppointmentListOrigin from "@/types/appointments/AppointmentListOrigin.types"
import css from "@/styles/components/appointmentTable.module.css"

type AppointmentProtocolLinkProps = {
    protocol: string
    to: string
    state: AppointmentListOrigin
}

function stopRowClick(event: MouseEvent<HTMLAnchorElement>) {
    event.stopPropagation()
}

function AppointmentProtocolLink({ protocol, to, state }: AppointmentProtocolLinkProps) {
    return (
        <Link to={to} state={state} className={css.protocol} onClick={stopRowClick}>
            {protocol}
        </Link>
    )
}

export default AppointmentProtocolLink
