import type { ReactNode } from "react"
import WhatsAppPrivacyField from "@/components/WhatsAppPrivacyField"
import type PrivacyField from "@/types/privacy/PrivacyField.types"
import type PrivacyFieldKey from "@/types/privacy/PrivacyFieldKey.types"
import css from "@/styles/components/whatsappPrivacyForm.module.css"

type WhatsAppPrivacyFormProps = {
    heading: string
    description: string
    fields: PrivacyField[]
    disabled: boolean
    onChange: (key: PrivacyFieldKey, value: string) => void
    children?: ReactNode
}

function WhatsAppPrivacyForm({
    heading,
    description,
    fields,
    disabled,
    onChange,
    children
}: WhatsAppPrivacyFormProps) {
    return (
        <section className={css.card}>
            <h2 className={css.title}>{heading}</h2>
            <p className={css.description}>{description}</p>
            <div className={css.fields}>
                {fields.map((field) => (
                    <WhatsAppPrivacyField
                        key={field.key}
                        field={field}
                        disabled={disabled}
                        onChange={(value) => onChange(field.key, value)}
                    />
                ))}
            </div>
            {children}
        </section>
    )
}

export default WhatsAppPrivacyForm
