import type { ReactNode } from "react"
import css from "@/styles/components/contentForms.module.css"

type ContentCheckFieldProps = {
    label: string
    hint?: ReactNode
    checked: boolean
    disabled?: boolean
    card?: boolean
    onChange: (checked: boolean) => void
}

function ContentCheckField({
    label,
    hint,
    checked,
    disabled = false,
    card = false,
    onChange
}: ContentCheckFieldProps) {
    const classes = [
        css.check,
        disabled ? css.checkDisabled : "",
        card ? css.checkCard : "",
        card && disabled ? css.checkCardDisabled : ""
    ]
        .filter(Boolean)
        .join(" ")

    return (
        <label className={classes}>
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
