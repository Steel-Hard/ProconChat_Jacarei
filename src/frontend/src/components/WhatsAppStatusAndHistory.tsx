import { useTranslation } from "react-i18next"
import whatsappSettingsApi from "@/store/api/whatsappSettings.api"
import type WhatsAppSettings from "@/types/whatsapp/WhatsAppSettings.types"
import formatDate from "@/utils/formatDate"
import formatTime from "@/utils/formatTime"
import css from "@/styles/pages/whatsapp.module.css"

type Props = { settings: WhatsAppSettings }

function timestamp(value: string | null, unknownLabel: string): string {
    if (value === null) {
        return unknownLabel
    }

    const date = formatDate(value)
    const parsed = new Date(value)

    return date === null || Number.isNaN(parsed.getTime())
        ? unknownLabel
        : `${date} às ${formatTime(parsed)}`
}

function WhatsAppStatusAndHistory({ settings }: Props) {
    const { t } = useTranslation(["whatsapp", "common"])
    const failures = whatsappSettingsApi.useGetWhatsAppDeliveryFailuresQuery()
    const history = whatsappSettingsApi.useGetWhatsAppHistoryQuery()
    const credentialsStatus = t(`numberStatus.credentials.${settings.credentialsStatus}`)

    return (
        <>
            <section className={css.card} aria-labelledby="whatsapp-number-status">
                <h2 className={css.sectionTitle} id="whatsapp-number-status">
                    {t("numberStatus.heading")}
                </h2>
                <dl className={css.statusList}>
                    <div className={css.statusRow}>
                        <dt>{t("numberStatus.credentials.label")}</dt>
                        <dd>
                            {credentialsStatus}
                            {settings.credentialsStatus === "VALID" && settings.credentialsCheckedAt
                                ? ` · ${t("numberStatus.credentials.checkedAt", {
                                      date: timestamp(settings.credentialsCheckedAt, "")
                                  })}`
                                : null}
                        </dd>
                    </div>
                    <div className={css.statusRow}>
                        <dt>{t("numberStatus.webhook.label")}</dt>
                        <dd>
                            {timestamp(
                                settings.webhook.lastEventAt,
                                t("numberStatus.webhook.none")
                            )}
                        </dd>
                    </div>
                </dl>
                {settings.credentialsStatus === "INVALID" ||
                settings.credentialsStatus === "EXPIRED" ? (
                    <p className={css.sectionDescription}>
                        {t("numberStatus.credentials.replace")}
                    </p>
                ) : null}
                {settings.webhook.stale ? (
                    <p className={css.warning} role="alert">
                        {t("numberStatus.webhook.stale")}
                    </p>
                ) : null}
            </section>

            <section className={css.card} aria-labelledby="whatsapp-delivery-failures">
                <h2 className={css.sectionTitle} id="whatsapp-delivery-failures">
                    {t("deliveryFailures.heading")}
                </h2>
                {failures.isLoading ? (
                    <p className={css.loading}>{t("common:loading")}</p>
                ) : failures.isError ? (
                    <p className={css.alert} role="alert">
                        {t("deliveryFailures.loadFailed")}
                    </p>
                ) : failures.data ? (
                    <>
                        <p className={css.sectionDescription}>
                            {t("deliveryFailures.count", { count: failures.data.count })}
                        </p>
                        {failures.data.items.length === 0 ? (
                            <p>{t("deliveryFailures.empty")}</p>
                        ) : (
                            <ul className={css.activityList}>
                                {failures.data.items.map((item) => (
                                    <li className={css.activityItem} key={item.id}>
                                        <div>
                                            <strong>
                                                {t(`deliveryFailures.kind.${item.kind}`)}
                                            </strong>
                                            {item.errorCode ? (
                                                <span className={css.activityDetail}>
                                                    {t("deliveryFailures.errorCode", {
                                                        code: item.errorCode
                                                    })}
                                                </span>
                                            ) : null}
                                            {item.appointmentId ? (
                                                <span className={css.activityDetail}>
                                                    {t("deliveryFailures.appointment", {
                                                        id: item.appointmentId
                                                    })}
                                                </span>
                                            ) : null}
                                        </div>
                                        <time dateTime={item.failedAt}>
                                            {timestamp(item.failedAt, t("unknownDate"))}
                                        </time>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </>
                ) : null}
            </section>

            <section className={css.card} aria-labelledby="whatsapp-settings-history">
                <h2 className={css.sectionTitle} id="whatsapp-settings-history">
                    {t("history.heading")}
                </h2>
                {history.isLoading ? (
                    <p className={css.loading}>{t("common:loading")}</p>
                ) : history.isError ? (
                    <p className={css.alert} role="alert">
                        {t("history.loadFailed")}
                    </p>
                ) : history.data?.items.length === 0 ? (
                    <p>{t("history.empty")}</p>
                ) : history.data ? (
                    <ul className={css.activityList}>
                        {history.data.items.map((item) => (
                            <li className={css.activityItem} key={item.id}>
                                <div>
                                    <strong>
                                        {t(`history.action.${item.action}`, {
                                            defaultValue: t("history.action.other")
                                        })}
                                    </strong>
                                    <span className={css.activityDetail}>
                                        {item.actor?.name ?? t("history.unknownActor")}
                                    </span>
                                    {item.fields.length > 0 ? (
                                        <span className={css.activityDetail}>
                                            {t("history.fields", {
                                                fields: item.fields
                                                    .map((field) =>
                                                        t(`history.field.${field}`, {
                                                            defaultValue: ""
                                                        })
                                                    )
                                                    .filter(Boolean)
                                                    .join(", ")
                                            })}
                                        </span>
                                    ) : null}
                                </div>
                                <time dateTime={item.createdAt}>
                                    {timestamp(item.createdAt, t("unknownDate"))}
                                </time>
                            </li>
                        ))}
                    </ul>
                ) : null}
            </section>
        </>
    )
}

export default WhatsAppStatusAndHistory
