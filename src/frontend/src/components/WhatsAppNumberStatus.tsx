import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import type WhatsAppSettings from "@/types/whatsapp/WhatsAppSettings.types"
import dateTimePartsOf from "@/utils/dateTimePartsOf"
import css from "@/styles/components/whatsappActivity.module.css"

type Props = { settings: WhatsAppSettings; children?: ReactNode }

type CredentialsStatus = WhatsAppSettings["credentialsStatus"]

const REPLACE_STATUSES: CredentialsStatus[] = ["INVALID", "EXPIRED"]

function toneOf(status: CredentialsStatus): { value: string; dot: string } | null {
    if (status === "VALID") {
        return { value: css.valueValid, dot: css.dotValid }
    }

    if (REPLACE_STATUSES.includes(status)) {
        return { value: css.valueInvalid, dot: css.dotInvalid }
    }

    return null
}

function WhatsAppNumberStatus({ settings, children }: Props) {
    const { t } = useTranslation(["whatsapp", "common"])
    const status = t(`numberStatus.credentials.${settings.credentialsStatus}`)
    const checkedParts = dateTimePartsOf(settings.credentialsCheckedAt)
    const webhookParts = dateTimePartsOf(settings.webhook.lastEventAt)
    const checkedDate = checkedParts ? t("dateTime", checkedParts) : ""
    const tone = toneOf(settings.credentialsStatus)
    const credentials =
        settings.credentialsStatus === "VALID" && settings.credentialsCheckedAt
            ? t("numberStatus.credentials.checkedAt", { status, date: checkedDate })
            : status
    const lastEvent = webhookParts ? t("dateTime", webhookParts) : t("numberStatus.webhook.none")

    return (
        <section className={css.statusCard} aria-labelledby="whatsapp-number-status">
            <h2 className={css.sectionTitle} id="whatsapp-number-status">
                {t("numberStatus.heading")}
            </h2>
            <div className={css.statusGrid}>
                <dl className={css.statusBlock}>
                    <dt className={css.statusLabel}>{t("numberStatus.credentials.label")}</dt>
                    <dd className={tone ? `${css.statusValue} ${tone.value}` : css.statusValue}>
                        {tone ? (
                            <span className={`${css.dot} ${tone.dot}`} aria-hidden="true" />
                        ) : null}
                        {credentials}
                    </dd>
                    {REPLACE_STATUSES.includes(settings.credentialsStatus) ? (
                        <dd className={css.statusHintInvalid}>
                            {t("numberStatus.credentials.replace")}
                        </dd>
                    ) : null}
                </dl>
                <dl className={css.statusBlock}>
                    <dt className={css.statusLabel}>{t("numberStatus.webhook.label")}</dt>
                    <dd className={css.statusValue}>{lastEvent}</dd>
                    {settings.webhook.stale ? (
                        <dd className={css.warning}>
                            <span role="alert">{t("numberStatus.webhook.stale")}</span>
                        </dd>
                    ) : null}
                </dl>
                {children}
            </div>
        </section>
    )
}

export default WhatsAppNumberStatus
