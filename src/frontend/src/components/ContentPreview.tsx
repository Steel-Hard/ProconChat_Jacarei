import { useTranslation } from "react-i18next"
import ContentPreviewBubble from "@/components/ContentPreviewBubble"
import ContentPreviewList from "@/components/ContentPreviewList"
import type ContentPreviewProps from "@/types/content/ContentPreviewProps.types"
import css from "@/styles/components/contentPreview.module.css"

function ContentPreview({ status, model, onClose, onRetry }: ContentPreviewProps) {
    const { t } = useTranslation("content")
    const showChat =
        model !== null && (status === "ready" || status === "updating" || status === "unsaved")

    return (
        <section className={css.preview} aria-label={t("preview.title")}>
            <div className={css.header}>
                <div>
                    <h3 className={css.title}>{t("preview.title")}</h3>
                    <p className={css.subtitle}>{t("preview.subtitle")}</p>
                </div>
                <button type="button" className={css.close} onClick={onClose}>
                    {t("preview.close")}
                </button>
            </div>

            <div className={css.notices}>
                {status === "unsaved" ? (
                    <>
                        <output className={`${css.notice} ${css.unsavedNotice}`}>
                            {t("preview.unsavedCategory")}
                        </output>
                        <p className={css.notice}>{t("preview.fullAfterSave")}</p>
                    </>
                ) : null}
                {status === "invalid" ? (
                    <output className={`${css.notice} ${css.fixErrors}`}>
                        {t("preview.fixErrors")}
                    </output>
                ) : null}
            </div>

            {status === "loading" ? <p className={css.loading}>{t("preview.loading")}</p> : null}

            {status === "error" ? (
                <p role="alert" className={css.error}>
                    {t("preview.error")}
                    <button type="button" className={css.retry} onClick={onRetry}>
                        {t("preview.retry")}
                    </button>
                </p>
            ) : null}

            {showChat ? (
                <div
                    className={status === "updating" ? `${css.chat} ${css.chatUpdating}` : css.chat}
                >
                    <ContentPreviewList list={model.list} />
                    {model.primaryBubbles.map((bubble) => (
                        <ContentPreviewBubble key={bubble.id} bubble={bubble} />
                    ))}
                    {model.fallbackBubbles.length > 0 ? (
                        <div className={css.alternative}>
                            <p className={css.alternativeTitle}>{t("preview.fallbackTitle")}</p>
                            <div className={css.alternativeChat}>
                                {model.fallbackBubbles.map((bubble) => (
                                    <ContentPreviewBubble key={bubble.id} bubble={bubble} />
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>
            ) : null}
        </section>
    )
}

export default ContentPreview
