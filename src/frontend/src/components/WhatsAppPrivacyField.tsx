import { useId } from "react"
import type PrivacyField from "@/types/privacy/PrivacyField.types"
import css from "@/styles/components/whatsappPrivacyForm.module.css"

type WhatsAppPrivacyFieldProps = {
    field: PrivacyField
    disabled: boolean
    onChange: (value: string) => void
}

function WhatsAppPrivacyField({ field, disabled, onChange }: WhatsAppPrivacyFieldProps) {
    const inputId = useId()
    const errorId = useId()
    const inputClass = field.changed ? `${css.input} ${css.changed}` : css.input
    const common = {
        id: inputId,
        className: field.multiline ? `${inputClass} ${css.textarea}` : inputClass,
        value: field.value,
        disabled,
        "aria-invalid": field.error !== null,
        "aria-describedby": field.error === null ? undefined : errorId
    }

    return (
        <div className={css.field}>
            <label htmlFor={inputId} className={css.label}>
                {field.label}
            </label>
            {field.multiline ? (
                <textarea {...common} rows={5} onChange={(event) => onChange(event.target.value)} />
            ) : (
                <input
                    {...common}
                    autoComplete="off"
                    onChange={(event) => onChange(event.target.value)}
                />
            )}
            {field.error === null ? null : (
                <span id={errorId} className={css.error}>
                    {field.error}
                </span>
            )}
        </div>
    )
}

export default WhatsAppPrivacyField
