import css from "@/styles/components/whatsappPauseSwitch.module.css"

type WhatsAppPauseSwitchProps = {
    label: string
    stateLabel: string
    checked: boolean
    disabled?: boolean
    onToggle: () => void
}

function WhatsAppPauseSwitch({
    label,
    stateLabel,
    checked,
    disabled = false,
    onToggle
}: WhatsAppPauseSwitchProps) {
    const trackClass = checked ? `${css.track} ${css.on}` : css.track

    return (
        <div className={css.wrapper}>
            <div>
                <div className={css.label}>{label}</div>
                <div className={css.state}>{stateLabel}</div>
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={label}
                className={trackClass}
                disabled={disabled}
                onClick={onToggle}
            >
                <span className={css.knob} aria-hidden="true" />
            </button>
        </div>
    )
}

export default WhatsAppPauseSwitch
