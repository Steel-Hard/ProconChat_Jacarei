import type WhatsAppTestMessage from "@/types/whatsapp/WhatsAppTestMessage.types"
import css from "@/styles/components/whatsappConnectionTest.module.css"

type WhatsAppConnectionTestProps = {
    buttonLabel: string
    testingText: string
    testing: boolean
    disabled: boolean
    message: WhatsAppTestMessage | null
    onTest: () => void
}

function WhatsAppConnectionTest({
    buttonLabel,
    testingText,
    testing,
    disabled,
    message,
    onTest
}: WhatsAppConnectionTestProps) {
    return (
        <div className={css.block}>
            <button
                type="button"
                className={css.button}
                disabled={disabled || testing}
                aria-busy={testing || undefined}
                onClick={onTest}
            >
                {buttonLabel}
            </button>
            <output className={css.result}>
                {testing ? (
                    <p className={css.testing}>
                        <span className={css.spinner} aria-hidden="true" />
                        {testingText}
                    </p>
                ) : null}
                {!testing && message !== null ? (
                    <p className={message.tone === "success" ? css.success : css.error}>
                        <strong>{message.title}</strong> {message.detail}
                    </p>
                ) : null}
            </output>
        </div>
    )
}

export default WhatsAppConnectionTest
