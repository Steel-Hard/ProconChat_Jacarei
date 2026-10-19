import Seal from "@/components/Seal"
import StatusBadge from "@/components/StatusBadge"
import type AppointmentSealView from "@/types/appointments/AppointmentSealView.types"
import type AppointmentStatus from "@/types/status/AppointmentStatus.types"
import css from "@/styles/components/appointmentDetailHeader.module.css"

type AppointmentDetailHeaderProps = {
    protocolLabel: string
    status: AppointmentStatus
    name: string
    subtitle: string
    seals: AppointmentSealView[]
}

function AppointmentDetailHeader({
    protocolLabel,
    status,
    name,
    subtitle,
    seals
}: AppointmentDetailHeaderProps) {
    return (
        <header className={css.header}>
            <div className={css.tags}>
                <span className={css.protocol}>{protocolLabel}</span>
                <StatusBadge kind="appointment" status={status} />
                {seals.map((seal) => (
                    <Seal key={seal.label} label={seal.label} tone={seal.tone} />
                ))}
            </div>
            <h1 className={css.name}>{name}</h1>
            <p className={css.subtitle}>{subtitle}</p>
        </header>
    )
}

export default AppointmentDetailHeader
