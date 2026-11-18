import type { ReactNode } from "react"
import css from "@/styles/components/appointmentNotice.module.css"

type Props = { children: ReactNode }

function AppointmentNotice({ children }: Props) {
    return (
        <output className={css.notice} data-tone="warning">
            {children}
        </output>
    )
}

export default AppointmentNotice
