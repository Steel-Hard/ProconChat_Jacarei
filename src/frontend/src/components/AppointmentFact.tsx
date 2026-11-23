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

function factClass(fact: AppointmentFactView): string | undefined {
    const classes = [fact.wide ? css.wide : "", fact.divided ? css.divided : ""].filter(Boolean)

    return classes.length > 0 ? classes.join(" ") : undefined
}

function AppointmentFact({ fact }: AppointmentFactProps) {
    return (
        <div className={factClass(fact)}>
            <dt className={css.factLabel}>{fact.label}</dt>
            <dd className={valueClass(fact)}>
                {fact.status ? <StatusBadge kind="appointment" status={fact.status} /> : null}
                {fact.prefix ? <span className={css.prefix}>{fact.prefix}</span> : null}
                {fact.prefix ? ` ${fact.value}` : fact.status ? null : fact.value}
            </dd>
        </div>
    )
}

export default AppointmentFact
