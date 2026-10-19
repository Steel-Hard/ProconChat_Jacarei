import type AppointmentTimelineStepView from "@/types/appointments/AppointmentTimelineStepView.types"
import css from "@/styles/components/appointmentDetailSection.module.css"

type AppointmentTimelineStepProps = {
    step: AppointmentTimelineStepView
    aiLabel: string
}

function AppointmentTimelineStep({ step, aiLabel }: AppointmentTimelineStepProps) {
    return (
        <li className={css.step}>
            <span className={css.dot} aria-hidden="true" />
            <div className={css.stepBody}>
                <div className={css.stepHead}>
                    <span className={css.stepTitle}>{step.title}</span>
                    <span className={css.stepTime}>{step.time}</span>
                    {step.ai ? <span className={css.ai}>{aiLabel}</span> : null}
                </div>
                {step.detail ? <p className={css.stepDetail}>{step.detail}</p> : null}
            </div>
        </li>
    )
}

export default AppointmentTimelineStep
