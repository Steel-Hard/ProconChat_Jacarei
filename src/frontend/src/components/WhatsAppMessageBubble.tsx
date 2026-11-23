import type { ReactNode } from "react"
import css from "@/styles/components/whatsappMessageBubble.module.css"

type WhatsAppMessageBubbleProps = {
    text: ReactNode
    time: string
}

function WhatsAppMessageBubble({ text, time }: WhatsAppMessageBubbleProps) {
    return (
        <p className={css.bubble}>
            <span className={css.text}>{text}</span>
            <time className={css.time}>{time}</time>
        </p>
    )
}

export default WhatsAppMessageBubble
