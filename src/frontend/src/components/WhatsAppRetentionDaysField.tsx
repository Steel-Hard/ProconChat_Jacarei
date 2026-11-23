import { useId } from "react"
import InfoTooltip from "@/components/InfoTooltip"
import type RetentionDaysField from "@/types/privacy/RetentionDaysField.types"
import css from "@/styles/components/whatsappPrivacyForm.module.css"

type WhatsAppRetentionDaysFieldProps = {
    field: RetentionDaysField
    disabled: boolean
    onChange: (value: string) => void
}

function WhatsAppRetentionDaysField({
    field,
    disabled,
    onChange
}: WhatsAppRetentionDaysFieldProps) {
    const inputId = useId()
    const errorId = useId()
    const inputClass = field.changed ? `${css.input} ${css.changed}` : css.input

    return (
        <div className={css.field}>
            <div className={css.labelRow}>
                <label htmlFor={inputId} className={css.label}>
                    {field.label}
                </label>
                <InfoTooltip text={field.hint} label={field.hintLabel} />
            </div>
            <input
                id={inputId}
                type="number"
                inputMode="numeric"
                min={field.min}
                max={field.max}
                step={1}
                className={`${inputClass} ${css.days}`}
                value={field.value}
                disabled={disabled}
                aria-invalid={field.error !== null}
                aria-describedby={field.error === null ? undefined : errorId}
                onChange={(event) => onChange(event.target.value)}
            />
            {field.error === null ? null : (
                <span id={errorId} className={css.error}>
                    {field.error}
                </span>
            )}
        </div>
    )
}

export default WhatsAppRetentionDaysField
