import { useId } from "react"
import ScheduleFieldMessages from "@/components/ScheduleFieldMessages"
import css from "@/styles/components/scheduleForm.module.css"

type ScheduleTextFieldProps = {
    label: string
    placeholder: string
    value: string
    messages: string[]
    onChange: (value: string) => void
}

function ScheduleTextField({
    label,
    placeholder,
    value,
    messages,
    onChange
}: ScheduleTextFieldProps) {
    const inputId = useId()
    const messagesId = useId()
    const invalid = messages.length > 0

    return (
        <div className={css.field}>
            <label htmlFor={inputId} className={css.label}>
                {label}
            </label>
            <input
                id={inputId}
                className={invalid ? `${css.textInput} ${css.inputInvalid}` : css.textInput}
                value={value}
                placeholder={placeholder}
                aria-invalid={invalid || undefined}
                aria-describedby={invalid ? messagesId : undefined}
                onChange={(event) => onChange(event.target.value)}
            />
            <ScheduleFieldMessages id={messagesId} messages={messages} />
        </div>
    )
}

export default ScheduleTextField
