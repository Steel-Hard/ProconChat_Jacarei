import WhatsAppCopyField from "@/components/WhatsAppCopyField"
import type WhatsAppCopyItem from "@/types/whatsapp/WhatsAppCopyItem.types"
import css from "@/styles/components/whatsappMetaSetup.module.css"

type WhatsAppMetaSetupProps = {
    heading: string
    items: WhatsAppCopyItem[]
    copyLabel: string
    steps: string[]
    highlightedStep?: number
    onCopy: (value: string) => void
}

function WhatsAppMetaSetup({
    heading,
    items,
    copyLabel,
    steps,
    highlightedStep,
    onCopy
}: WhatsAppMetaSetupProps) {
    return (
        <div className={css.panel}>
            <h3 className={css.heading}>{heading}</h3>
            {items.map((item) => (
                <WhatsAppCopyField
                    key={item.label}
                    item={item}
                    copyLabel={copyLabel}
                    onCopy={onCopy}
                />
            ))}
            <ol className={css.steps}>
                {steps.map((step, index) => (
                    <li
                        key={step}
                        className={index === highlightedStep ? css.highlighted : undefined}
                    >
                        {step}
                    </li>
                ))}
            </ol>
        </div>
    )
}

export default WhatsAppMetaSetup
