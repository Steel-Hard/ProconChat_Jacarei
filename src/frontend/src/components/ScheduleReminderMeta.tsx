import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import WhatsAppTemplateItem from "@/components/WhatsAppTemplateItem"
import useWhatsAppMetaStatus from "@/pages/hooks/useWhatsAppMetaStatus"
import ROUTES from "@/routers/paths"
import css from "@/styles/components/scheduleForm.module.css"
import activity from "@/styles/components/whatsappActivity.module.css"

const NEAR_LIMIT_PERCENT = 80
const numberFormat = new Intl.NumberFormat("pt-BR")

function ScheduleReminderMeta() {
    const { t } = useTranslation(["schedule", "whatsapp", "common"])
    const { templates, number } = useWhatsAppMetaStatus()
    const reminder = templates.data?.templates.find((item) => item.kind === "REMINDER")
    const limit = number.limit

    return (
        <div className={css.reminderMeta}>
            <span className={css.label}>{t("reminder.metaHeading")}</span>
            {templates.loading ? <p className={css.help}>{t("common:loading")}</p> : null}
            {templates.failed ? (
                <p role="alert" className={activity.warning}>
                    {templates.reason
                        ? t(`whatsapp:reasons.${templates.reason}`)
                        : t("whatsapp:metaStatus.loadFailed")}
                </p>
            ) : null}
            {reminder ? (
                <ul className={css.reminderMetaList}>
                    <WhatsAppTemplateItem template={reminder} />
                </ul>
            ) : null}
            {limit?.kind === "limited" ? (
                <>
                    <p className={activity.limitTotal}>
                        {t("whatsapp:metaStatus.number.dailyLimit", {
                            total: numberFormat.format(limit.total)
                        })}
                    </p>
                    <p className={css.help}>
                        {t("whatsapp:metaStatus.number.used", {
                            used: numberFormat.format(limit.used),
                            total: numberFormat.format(limit.total)
                        })}
                    </p>
                    <progress
                        className={
                            limit.percent > NEAR_LIMIT_PERCENT
                                ? `${activity.usageProgress} ${activity.usageProgressDanger}`
                                : activity.usageProgress
                        }
                        max={100}
                        value={limit.percent}
                        aria-label={t("whatsapp:metaStatus.number.usageProgress")}
                    />
                    {limit.percent > NEAR_LIMIT_PERCENT ? (
                        <p role="alert" className={activity.warning}>
                            {t("whatsapp:metaStatus.number.nearLimit")}
                        </p>
                    ) : null}
                </>
            ) : null}
            {limit?.kind === "unlimited" ? (
                <p className={activity.limitTotal}>{t("whatsapp:metaStatus.number.unlimited")}</p>
            ) : null}
            {limit?.kind === "unknown" ? (
                <p className={activity.limitTotal}>
                    {t("whatsapp:metaStatus.number.limitUnknown")}
                </p>
            ) : null}
            {number.failed && !templates.failed ? (
                <p role="alert" className={activity.warning}>
                    {number.reason
                        ? t(`whatsapp:reasons.${number.reason}`)
                        : t("whatsapp:metaStatus.loadFailed")}
                </p>
            ) : null}
            <Link to={ROUTES.whatsapp} className={css.reminderMetaLink}>
                {t("reminder.adminLink")}
            </Link>
        </div>
    )
}

export default ScheduleReminderMeta
