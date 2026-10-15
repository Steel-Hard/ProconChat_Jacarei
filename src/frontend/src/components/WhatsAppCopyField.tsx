import { useId } from "react"
import type WhatsAppCopyItem from "@/types/whatsapp/WhatsAppCopyItem.types"
import css from "@/styles/components/whatsappCopyField.module.css"

type WhatsAppCopyFieldProps = {
    item: WhatsAppCopyItem
    copyLabel: string
    onCopy: (value: string) => void
}

function WhatsAppCopyField({ item, copyLabel, onCopy }: WhatsAppCopyFieldProps) {
    const labelId = useId()
    const { value } = item

    return (
        <fieldset aria-labelledby={labelId} className={css.field}>
            <span id={labelId} className={css.label}>
                {item.label}
            </span>
            {value === null ? (
                <p className={css.missing}>{item.missingText}</p>
            ) : (
                <div className={css.row}>
                    <code className={css.value}>{value}</code>
                    <button type="button" className={css.copy} onClick={() => onCopy(value)}>
                        {copyLabel}
                    </button>
                </div>
            )}
        </fieldset>
    )
}

export default WhatsAppCopyField
