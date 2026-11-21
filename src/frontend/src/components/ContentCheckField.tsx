import type { ReactNode } from "react"
import css from "@/styles/components/contentForms.module.css"

type ContentCheckFieldProps = {
    label: string
    hint?: ReactNode
    checked: boolean
    disabled?: boolean
    onChange: (checked: boolean) => void
}

function ContentCheckField({
    label,
    hint,
    checked,
    disabled = false,
    onChange
}: ContentCheckFieldProps) {
    return (
        <label className={disabled ? `${css.check} ${css.checkDisabled}` : css.check}>
            <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(event) => onChange(event.target.checked)}
            />
            <span>
                {label}
                {hint ? <span className={css.checkHint}>{hint}</span> : null}
            </span>
        </label>
    )
}

export default ContentCheckField
