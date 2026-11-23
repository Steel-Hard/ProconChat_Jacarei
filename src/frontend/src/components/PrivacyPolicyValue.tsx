import css from "@/styles/components/privacyPolicyValue.module.css"

type PrivacyPolicyValueProps = {
    label: string
    value: string | null
    missingText: string
    email?: boolean
}

function PrivacyPolicyValue({ label, value, missingText, email = false }: PrivacyPolicyValueProps) {
    return (
        <p className={css.value}>
            <span className={css.label}>{label}</span>
            {value === null ? (
                <span className={css.missing}>{missingText}</span>
            ) : email ? (
                <a className={css.link} href={`mailto:${value}`}>
                    {value}
                </a>
            ) : (
                <span className={css.text}>{value}</span>
            )}
        </p>
    )
}

export default PrivacyPolicyValue
