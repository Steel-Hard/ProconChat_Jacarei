import { useId } from "react"
import type WhatsAppSecretValue from "@/types/whatsapp/WhatsAppSecretValue.types"
import css from "@/styles/components/whatsappSecretField.module.css"

type WhatsAppSecretFieldProps = {
    label: string
    secret: WhatsAppSecretValue
    maskedText: string
    replaceLabel: string
    cancelLabel: string
    placeholder: string
    storedNote: string
    hint?: string
    disabled?: boolean
    onReplace: () => void
    onCancel: () => void
    onChange: (value: string) => void
}

function WhatsAppSecretField({
    label,
    secret,
    maskedText,
    replaceLabel,
    cancelLabel,
    placeholder,
    storedNote,
    hint,
    disabled = false,
    onReplace,
    onCancel,
    onChange
}: WhatsAppSecretFieldProps) {
    const labelId = useId()
    const inputId = useId()
    const editing = !secret.configured || secret.value !== null
    const inputClass = secret.value ? `${css.input} ${css.changed}` : css.input

    return (
        <fieldset aria-labelledby={labelId} className={css.field}>
            {editing ? (
                <label id={labelId} htmlFor={inputId} className={css.label}>
                    {label}
                </label>
            ) : (
                <span id={labelId} className={css.label}>
                    {label}
                </span>
            )}
            {editing ? (
                <div className={css.row}>
                    <input
                        id={inputId}
                        className={inputClass}
                        type="password"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder={placeholder}
                        value={secret.value ?? ""}
                        disabled={disabled}
                        onChange={(event) => onChange(event.target.value)}
                    />
                    {secret.configured ? (
                        <button
                            type="button"
                            className={css.action}
                            disabled={disabled}
                            onClick={onCancel}
                        >
                            {cancelLabel}
                        </button>
                    ) : null}
                </div>
            ) : (
                <div className={css.row}>
                    <span className={css.mask}>{maskedText}</span>
                    <button
                        type="button"
                        className={css.action}
                        disabled={disabled}
                        onClick={onReplace}
                    >
                        {replaceLabel}
                    </button>
                </div>
            )}
            {secret.configured ? <span className={css.note}>{storedNote}</span> : null}
            {hint ? <span className={css.hint}>{hint}</span> : null}
        </fieldset>
    )
}

export default WhatsAppSecretField
