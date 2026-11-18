import css from "@/styles/components/whatsappPauseSwitch.module.css"

type WhatsAppPauseSwitchProps = {
    label: string
    stateLabel: string
    checked: boolean
    disabled?: boolean
    tone?: "warning" | "primary"
    placement?: "inline" | "end"
    describedBy?: string
    onToggle: () => void
}

function WhatsAppPauseSwitch({
    label,
    stateLabel,
    checked,
    disabled = false,
    tone = "warning",
    placement = "inline",
    describedBy,
    onToggle
}: WhatsAppPauseSwitchProps) {
    const onClass = tone === "primary" ? css.onPrimary : css.on
    const trackClass = checked ? `${css.track} ${onClass}` : css.track

    return (
        <div className={placement === "end" ? `${css.wrapper} ${css.spread}` : css.wrapper}>
            <div className={css.text}>
                <div className={css.label}>{label}</div>
                <div className={css.state}>{stateLabel}</div>
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={label}
                aria-describedby={describedBy}
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
