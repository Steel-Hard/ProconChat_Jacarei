import { useTranslation } from "react-i18next"
import type WhatsAppSettings from "@/types/whatsapp/WhatsAppSettings.types"
import dateTimePartsOf from "@/utils/dateTimePartsOf"
import css from "@/styles/components/whatsappActivity.module.css"

type Props = { settings: WhatsAppSettings }

const REPLACE_STATUSES: WhatsAppSettings["credentialsStatus"][] = ["INVALID", "EXPIRED"]

function WhatsAppNumberStatus({ settings }: Props) {
    const { t } = useTranslation(["whatsapp", "common"])
    const status = t(`numberStatus.credentials.${settings.credentialsStatus}`)
    const checkedParts = dateTimePartsOf(settings.credentialsCheckedAt)
    const webhookParts = dateTimePartsOf(settings.webhook.lastEventAt)
    const checkedDate = checkedParts ? t("dateTime", checkedParts) : ""
    const credentials =
        settings.credentialsStatus === "VALID" && settings.credentialsCheckedAt
            ? t("numberStatus.credentials.checkedAt", { status, date: checkedDate })
            : status
    const lastEvent = webhookParts ? t("dateTime", webhookParts) : t("numberStatus.webhook.none")

    return (
        <section className={css.card} aria-labelledby="whatsapp-number-status">
            <h2 className={css.sectionTitle} id="whatsapp-number-status">
                {t("numberStatus.heading")}
            </h2>
            <dl className={css.statusList}>
                <div className={css.statusRow}>
                    <dt>{t("numberStatus.credentials.label")}</dt>
                    <dd>{credentials}</dd>
                </div>
                <div className={css.statusRow}>
                    <dt>{t("numberStatus.webhook.label")}</dt>
                    <dd>{lastEvent}</dd>
                </div>
            </dl>
            {REPLACE_STATUSES.includes(settings.credentialsStatus) ? (
                <p className={css.sectionDescription}>{t("numberStatus.credentials.replace")}</p>
            ) : null}
            {settings.webhook.stale ? (
                <p className={css.warning} role="alert">
                    {t("numberStatus.webhook.stale")}
                </p>
            ) : null}
        </section>
    )
}

export default WhatsAppNumberStatus
