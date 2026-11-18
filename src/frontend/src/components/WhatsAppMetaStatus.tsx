import { useTranslation } from "react-i18next"
import WhatsAppTemplateItem from "@/components/WhatsAppTemplateItem"
import useWhatsAppMetaStatus from "@/pages/hooks/useWhatsAppMetaStatus"
import css from "@/styles/components/whatsappActivity.module.css"

function WhatsAppMetaStatus() {
    const { t } = useTranslation(["whatsapp", "common"])
    const { templates, updating, refresh } = useWhatsAppMetaStatus()

    return (
        <section className={css.listCard}>
            <div className={css.metaHeader}>
                <h2 className={css.sectionTitle}>{t("metaStatus.templates.heading")}</h2>
                <button
                    type="button"
                    className={css.refreshButton}
                    disabled={updating}
                    aria-busy={updating || undefined}
                    onClick={refresh}
                >
                    {updating ? t("metaStatus.refreshing") : t("metaStatus.refresh")}
                </button>
            </div>
            {templates.loading ? <p className={css.note}>{t("common:loading")}</p> : null}
            {templates.failed ? (
                <p role="alert" className={css.warning}>
                    {templates.reason
                        ? t(`reasons.${templates.reason}`)
                        : t("metaStatus.loadFailed")}
                </p>
            ) : null}
            {templates.data ? (
                <>
                    <p className={css.note}>{t("metaStatus.templates.support")}</p>
                    <p className={css.note}>
                        {t("metaStatus.checkedAt", {
                            date: templates.checkedAt?.date ?? t("unknownDate"),
                            time: templates.checkedAt?.time ?? ""
                        })}
                    </p>
                    <ul className={css.metaList}>
                        {templates.data.templates.map((template) => (
                            <WhatsAppTemplateItem
                                key={`${template.kind}-${template.name}-${template.languageCode}`}
                                template={template}
                            />
                        ))}
                        {templates.data.templates.length === 0 ? (
                            <li className={css.empty}>{t("metaStatus.templates.empty")}</li>
                        ) : null}
                    </ul>
                </>
            ) : null}
        </section>
    )
}

export default WhatsAppMetaStatus
