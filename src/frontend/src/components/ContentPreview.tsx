import { useEffect, useId, useRef } from "react"
import { useTranslation } from "react-i18next"
import ContentPreviewBubble from "@/components/ContentPreviewBubble"
import ContentPreviewList from "@/components/ContentPreviewList"
import type ContentPreviewProps from "@/types/content/ContentPreviewProps.types"
import css from "@/styles/components/contentPreview.module.css"

const DIALOG_PROPS = { role: "dialog", "aria-modal": true } as const

function ContentPreview({ status, model, onClose, onRetry }: ContentPreviewProps) {
    const { t } = useTranslation("content")
    const titleId = useId()
    const titleRef = useRef<HTMLHeadingElement>(null)
    const showChat =
        model !== null && (status === "ready" || status === "updating" || status === "unsaved")

    useEffect(() => {
        titleRef.current?.focus()
        titleRef.current?.scrollIntoView?.({ block: "start", behavior: "smooth" })
    }, [])

    return (
        <section {...DIALOG_PROPS} className={css.phone} aria-labelledby={titleId}>
            <header className={css.phoneHeader}>
                <div>
                    <h3 id={titleId} ref={titleRef} tabIndex={-1} className={css.phoneTitle}>
                        {t("preview.windowTitle")}
                    </h3>
                    <p className={css.phoneSubtitle}>{t("preview.subtitle")}</p>
                </div>
                <button
                    type="button"
                    className={css.phoneClose}
                    aria-label={t("preview.closeShort")}
                    onClick={onClose}
                >
                    {t("icons.remove")}
                </button>
            </header>

            <div
                className={
                    status === "updating" ? `${css.phoneBody} ${css.chatUpdating}` : css.phoneBody
                }
            >
                <div className={css.notices}>
                    {status === "unsaved" ? (
                        <>
                            <output className={`${css.notice} ${css.unsavedNotice}`}>
                                {t("preview.unsavedCategory")}
                            </output>
                            <p className={css.notice}>{t("preview.fullAfterSave")}</p>
                        </>
                    ) : null}
                    {status === "updating" ? (
                        <output className={css.notice}>{t("preview.updating")}</output>
                    ) : null}
                    {status === "invalid" ? (
                        <output className={`${css.notice} ${css.fixErrors}`}>
                            {t("preview.fixErrors")}
                        </output>
                    ) : null}
                    {showChat && model.lengthWarning !== null ? (
                        <output className={`${css.notice} ${css.unsavedNotice}`}>
                            {model.lengthWarning}
                        </output>
                    ) : null}
                </div>

                {status === "loading" ? (
                    <p className={css.loading}>{t("preview.loading")}</p>
                ) : null}

                {status === "error" ? (
                    <p role="alert" className={css.error}>
                        {t("preview.error")}
                        <button type="button" className={css.retry} onClick={onRetry}>
                            {t("preview.retry")}
                        </button>
                    </p>
                ) : null}

                {showChat ? (
                    <>
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
                    </>
                ) : null}
            </div>

            <p className={css.phoneFooter}>{t("preview.footerNote")}</p>
        </section>
    )
}

export default ContentPreview
