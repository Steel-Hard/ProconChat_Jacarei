import css from "@/styles/components/whatsappMessageBubble.module.css"

type WhatsAppMessageBubbleProps = {
    text: string
    time: string
}

function WhatsAppMessageBubble({ text, time }: WhatsAppMessageBubbleProps) {
    return (
        <p className={css.bubble}>
            <span>{text}</span>
            <time className={css.time}>{time}</time>
        </p>
    )
}

export default WhatsAppMessageBubble
