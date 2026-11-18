import { useTranslation } from "react-i18next"
import type WhatsAppMessageTemplateStatus from "@/types/whatsapp/WhatsAppMessageTemplateStatus.types"
import whatsAppTemplateToneOf from "@/utils/whatsAppTemplateToneOf"
import css from "@/styles/components/whatsappActivity.module.css"

type Props = { template: WhatsAppMessageTemplateStatus }

const BADGE_CLASS = {
    success: css.badgeSuccess,
    warning: css.badgeWarning,
    danger: css.badgeDanger
}

const ALERT_CLASS = {
    success: css.warning,
    warning: css.warningAmber,
    danger: css.warning
}

function WhatsAppTemplateItem({ template }: Props) {
    const { t } = useTranslation("whatsapp")
    const tone = whatsAppTemplateToneOf(template.status)
    const statusText =
        template.status === "OTHER" && template.metaStatus
            ? template.metaStatus
            : t(`metaStatus.templates.status.${template.status}`)

    return (
        <li className={css.metaItem}>
            <div className={css.metaTemplate}>
                <div className={css.metaTemplateName}>
                    <span className={css.metaTemplateLabel}>
                        {t(`metaStatus.templates.kind.${template.kind}`)}
                    </span>
                    <code className={css.metaTemplateId}>{template.name}</code>
                </div>
                <span className={`${css.badge} ${BADGE_CLASS[tone]}`} data-tone={tone}>
                    {statusText}
                </span>
            </div>
            {template.status !== "APPROVED" ? (
                <p role="alert" className={ALERT_CLASS[tone]} data-tone={tone}>
                    {t(`metaStatus.templates.notApproved.${template.kind}`)}
                    {template.status === "REJECTED" ? (
                        <span className={css.rejectedNote}>
                            {t("metaStatus.templates.rejectedNote")}
                        </span>
                    ) : null}
                </p>
            ) : null}
        </li>
    )
}

export default WhatsAppTemplateItem
