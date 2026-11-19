import type { CSSProperties } from "react"
import type AppointmentTimelineStepView from "@/types/appointments/AppointmentTimelineStepView.types"
import css from "@/styles/components/appointmentDetailSection.module.css"

type AppointmentTimelineStepProps = {
    step: AppointmentTimelineStepView
    aiLabel: string
}

function toneStyle(tone: AppointmentTimelineStepView["tone"]): CSSProperties | undefined {
    if (tone === undefined) {
        return undefined
    }

    return { "--step-dot": tone.dot, "--step-ring": tone.ring } as CSSProperties
}

function AppointmentTimelineStep({ step, aiLabel }: AppointmentTimelineStepProps) {
    return (
        <li className={css.step}>
            <span className={css.dot} style={toneStyle(step.tone)} aria-hidden="true" />
            <div className={css.stepBody}>
                <div className={css.stepHead}>
                    <span className={css.stepTitle}>{step.title}</span>
                    <span className={css.stepTime}>{step.time}</span>
                    {step.ai ? <span className={css.ai}>{aiLabel}</span> : null}
                </div>
                {step.detail ? <p className={css.stepDetail}>{step.detail}</p> : null}
                {step.action ? (
                    <button type="button" className={css.stepAction} onClick={step.action.onClick}>
                        {step.action.label}
                    </button>
                ) : null}
            </div>
        </li>
    )
}

export default AppointmentTimelineStep
