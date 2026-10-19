import StatusBadge from "@/components/StatusBadge"
import type AppointmentFactView from "@/types/appointments/AppointmentFactView.types"
import css from "@/styles/components/appointmentDetailSection.module.css"

type AppointmentFactsProps = {
    title: string
    facts: AppointmentFactView[]
    notice: string | null
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

function AppointmentFacts({ title, facts, notice }: AppointmentFactsProps) {
    return (
        <section className={css.section}>
            <h2 className={css.title}>{title}</h2>
            <dl className={css.facts}>
                {facts.map((fact) => (
                    <div key={fact.label} className={fact.wide ? css.wide : undefined}>
                        <dt className={css.factLabel}>{fact.label}</dt>
                        <dd className={valueClass(fact)}>
                            {fact.status ? (
                                <StatusBadge kind="appointment" status={fact.status} />
                            ) : (
                                fact.value
                            )}
                        </dd>
                    </div>
                ))}
            </dl>
            {notice ? <p className={css.notice}>{notice}</p> : null}
        </section>
    )
}

export default AppointmentFacts
