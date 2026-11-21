import type ContentPreviewBubbleModel from "@/types/content/ContentPreviewBubbleModel.types"
import css from "@/styles/components/contentPreview.module.css"

type ContentPreviewBubbleProps = {
    bubble: ContentPreviewBubbleModel
}

function ContentPreviewBubble({ bubble }: ContentPreviewBubbleProps) {
    return (
        <div className={css.group}>
            <div className={css.bubble}>
                {bubble.text.split("\n").map((line, index) => (
                    <p key={index} className={css.bubbleText}>
                        {line}
                    </p>
                ))}
                {bubble.footerLabel !== null ? (
                    <div className={css.bubbleFooter}>
                        <span className={css.aiLabel}>{bubble.footerLabel}</span>
                    </div>
                ) : null}
            </div>
            {bubble.buttons.length > 0 ? (
                <div className={css.buttons}>
                    {bubble.buttons.map((button) => (
                        <span key={button} className={css.button}>
                            {button}
                        </span>
                    ))}
                </div>
            ) : null}
        </div>
    )
}

export default ContentPreviewBubble
