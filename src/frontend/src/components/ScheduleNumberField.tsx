import { useId } from "react"
import ScheduleFieldMessages from "@/components/ScheduleFieldMessages"
import css from "@/styles/components/scheduleForm.module.css"

type ScheduleNumberFieldProps = {
    label: string
    value: string
    min: number
    max: number
    suffix?: string
    help?: string
    messages: string[]
    onChange: (value: string) => void
}

function ScheduleNumberField({
    label,
    value,
    min,
    max,
    suffix,
    help,
    messages,
    onChange
}: ScheduleNumberFieldProps) {
    const inputId = useId()
    const helpId = useId()
    const messagesId = useId()
    const invalid = messages.length > 0
    const describedBy = [help ? helpId : null, invalid ? messagesId : null]
        .filter(Boolean)
        .join(" ")

    return (
        <div className={css.field}>
            <label htmlFor={inputId} className={css.label}>
                {label}
            </label>
            <div className={css.inline}>
                <input
                    id={inputId}
                    type="number"
                    inputMode="numeric"
                    min={min}
                    max={max}
                    className={invalid ? `${css.numberInput} ${css.inputInvalid}` : css.numberInput}
                    value={value}
                    aria-invalid={invalid || undefined}
                    aria-describedby={describedBy || undefined}
                    onChange={(event) => onChange(event.target.value)}
                />
                {suffix ? <span className={css.suffix}>{suffix}</span> : null}
            </div>
            {help ? (
                <span id={helpId} className={css.help}>
                    {help}
                </span>
            ) : null}
            <ScheduleFieldMessages id={messagesId} messages={messages} />
        </div>
    )
}

export default ScheduleNumberField
