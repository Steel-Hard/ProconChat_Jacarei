import AppointmentTimelineStep from "@/components/AppointmentTimelineStep"
import type AppointmentTimelineStepView from "@/types/appointments/AppointmentTimelineStepView.types"
import css from "@/styles/components/appointmentDetailSection.module.css"

type AppointmentTimelineProps = {
    title: string
    note: string
    emptyText: string
    aiLabel: string
    steps: AppointmentTimelineStepView[]
}

function AppointmentTimeline({ title, note, emptyText, aiLabel, steps }: AppointmentTimelineProps) {
    return (
        <section className={css.section}>
            <h2 className={css.title}>{title}</h2>
            <p className={css.lead}>{note}</p>
            {steps.length > 0 ? (
                <ol className={css.timeline}>
                    {steps.map((step) => (
                        <AppointmentTimelineStep key={step.id} step={step} aiLabel={aiLabel} />
                    ))}
                </ol>
            ) : (
                <p className={css.muted}>{emptyText}</p>
            )}
        </section>
    )
}

export default AppointmentTimeline
