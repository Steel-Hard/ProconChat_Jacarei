import { useId, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import css from "@/styles/components/contentForms.module.css"

type ContentTextFieldProps = {
    label: string
    value: string
    onChange: (value: string) => void
    max?: number
    optional?: boolean
    multiline?: boolean
    tall?: boolean
    hint?: ReactNode
    error?: string | null
    warnings?: string[]
    placeholder?: string
    rows?: number
}

function counterClass(length: number, max: number): string {
    if (length > max) {
        return `${css.counter} ${css.counterOver}`
    }

    return length >= max * 0.9 ? `${css.counter} ${css.counterNear}` : css.counter
}

function ContentTextField({
    label,
    value,
    onChange,
    max,
    optional = false,
    multiline = false,
    tall = false,
    hint,
    error = null,
    warnings = [],
    placeholder,
    rows
}: ContentTextFieldProps) {
    const { t } = useTranslation("content")
    const id = useId()
    const errorId = `${id}-error`
    const warningId = `${id}-warning`
    const hintId = `${id}-hint`
    const counterId = `${id}-counter`
    const describedBy = [
        error ? errorId : null,
        warnings.length > 0 ? warningId : null,
        hint ? hintId : null,
        max !== undefined ? counterId : null
    ]
        .filter(Boolean)
        .join(" ")
    const announce = max !== undefined && value.length >= max * 0.9
    const common = {
        id,
        value,
        placeholder,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy || undefined,
        onChange: (event: { target: { value: string } }) => onChange(event.target.value)
    }

    return (
        <div className={css.field}>
            <div className={css.labelRow}>
                <label htmlFor={id} className={css.label}>
                    {label}
                    {optional ? (
                        <span className={css.optional}>{t("categoryForm.optional")}</span>
                    ) : null}
                </label>
                {max !== undefined ? (
                    <span
                        id={counterId}
                        className={counterClass(value.length, max)}
                        aria-live={announce ? "polite" : undefined}
                    >
                        {t("counter", { count: value.length, max })}
                    </span>
                ) : null}
            </div>
            {multiline ? (
                <textarea
                    {...common}
                    rows={rows}
                    className={tall ? `${css.textarea} ${css.textareaTall}` : css.textarea}
                />
            ) : (
                <input {...common} type="text" className={css.input} />
            )}
            {hint ? (
                <p id={hintId} className={css.hint}>
                    {hint}
                </p>
            ) : null}
            {warnings.length > 0 ? (
                <output id={warningId} className={css.longAnswerAlert}>
                    {warnings.map((warning) => (
                        <p key={warning} className={css.warningLine}>
                            {warning}
                        </p>
                    ))}
                </output>
            ) : null}
            {error ? (
                <p id={errorId} className={css.error}>
                    {error}
                </p>
            ) : null}
        </div>
    )
}

export default ContentTextField
