import InfoTooltip from "@/components/InfoTooltip"
import WhatsAppRetentionDaysField from "@/components/WhatsAppRetentionDaysField"
import type RetentionDaysField from "@/types/privacy/RetentionDaysField.types"
import type RetentionDaysKey from "@/types/privacy/RetentionDaysKey.types"
import type RetentionToggle from "@/types/privacy/RetentionToggle.types"
import css from "@/styles/components/whatsappPrivacyForm.module.css"
import switchCss from "@/styles/components/whatsappPauseSwitch.module.css"

type WhatsAppRetentionFieldsProps = {
    toggle: RetentionToggle
    days: RetentionDaysField[]
    disabled: boolean
    onToggle: () => void
    onDaysChange: (key: RetentionDaysKey, value: string) => void
}

function WhatsAppRetentionFields({
    toggle,
    days,
    disabled,
    onToggle,
    onDaysChange
}: WhatsAppRetentionFieldsProps) {
    const trackClass = toggle.checked ? `${switchCss.track} ${switchCss.on}` : switchCss.track

    return (
        <div className={css.fields}>
            <div className={css.field}>
                <div className={css.labelRow}>
                    <span className={css.label}>{toggle.label}</span>
                    <InfoTooltip text={toggle.hint} label={toggle.hintLabel} />
                </div>
                <div className={switchCss.wrapper}>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={toggle.checked}
                        aria-label={toggle.label}
                        className={trackClass}
                        disabled={disabled}
                        onClick={onToggle}
                    >
                        <span className={switchCss.knob} aria-hidden="true" />
                    </button>
                    <span className={switchCss.state}>{toggle.stateLabel}</span>
                </div>
            </div>
            <div className={css.daysRow}>
                {days.map((field) => (
                    <WhatsAppRetentionDaysField
                        key={field.key}
                        field={field}
                        disabled={disabled}
                        onChange={(value) => onDaysChange(field.key, value)}
                    />
                ))}
            </div>
        </div>
    )
}

export default WhatsAppRetentionFields
