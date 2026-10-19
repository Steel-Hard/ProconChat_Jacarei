import StatusBadge from "@/components/StatusBadge"
import type AppointmentFactView from "@/types/appointments/AppointmentFactView.types"
import css from "@/styles/components/appointmentDetailSection.module.css"

type AppointmentFactProps = {
    fact: AppointmentFactView
}

function valueClass(fact: AppointmentFactView): string {
    const classes = [css.factValue]

    if (fact.mono) {
        classes.push(css.mono)
    }

    if (fact.emphasis) {
        classes.push(css.emphasis)
    }

    return classes.join(" ")
}

function AppointmentFact({ fact }: AppointmentFactProps) {
    return (
        <div className={fact.wide ? css.wide : undefined}>
            <dt className={css.factLabel}>{fact.label}</dt>
            <dd className={valueClass(fact)}>
                {fact.status ? <StatusBadge kind="appointment" status={fact.status} /> : fact.value}
            </dd>
        </div>
    )
}

export default AppointmentFact
