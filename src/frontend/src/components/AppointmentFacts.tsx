import AppointmentFact from "@/components/AppointmentFact"
import type AppointmentFactView from "@/types/appointments/AppointmentFactView.types"
import css from "@/styles/components/appointmentDetailSection.module.css"

type AppointmentFactsProps = {
    title: string
    facts: AppointmentFactView[]
    notice: string | null
}

function AppointmentFacts({ title, facts, notice }: AppointmentFactsProps) {
    return (
        <section className={css.section}>
            <h2 className={css.title}>{title}</h2>
            <dl className={css.facts}>
                {facts.map((fact) => (
                    <AppointmentFact key={fact.label} fact={fact} />
                ))}
            </dl>
            {notice ? <p className={css.notice}>{notice}</p> : null}
        </section>
    )
}

export default AppointmentFacts
