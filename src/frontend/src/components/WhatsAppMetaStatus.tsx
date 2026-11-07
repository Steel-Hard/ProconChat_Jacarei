import { useTranslation } from "react-i18next"
import whatsappSettingsApi from "@/store/api/whatsappSettings.api"
import type WhatsAppConnectionReason from "@/types/whatsapp/WhatsAppConnectionReason.types"
import type WhatsAppMessageTemplateStatus from "@/types/whatsapp/WhatsAppMessageTemplateStatus.types"
import dateTimePartsOf from "@/utils/dateTimePartsOf"
import css from "@/styles/components/whatsappActivity.module.css"

const CONNECTION_REASONS: WhatsAppConnectionReason[] = [
    "INVALID_TOKEN",
    "INVALID_APP_SECRET",
    "PHONE_NUMBER_NOT_FOUND",
    "BUSINESS_ACCOUNT_NOT_FOUND",
    "PHONE_NOT_IN_ACCOUNT",
    "MISSING_PERMISSION",
    "META_UNAVAILABLE",
    "META_ERROR"
]

function errorCodeOf(error: unknown): string | null {
    if (typeof error !== "object" || error === null || !("data" in error)) {
        return null
    }

    const data = error.data
    if (typeof data !== "object" || data === null || !("error" in data)) {
        return null
    }

    const payload = data.error
    if (typeof payload !== "object" || payload === null || !("code" in payload)) {
        return null
    }

    return typeof payload.code === "string" ? payload.code : null
}

function connectionReasonOf(error: unknown): WhatsAppConnectionReason | null {
    const code = errorCodeOf(error)
    return CONNECTION_REASONS.find((item) => item === code) ?? null
}

function statusLabelKey(template: WhatsAppMessageTemplateStatus) {
    return `metaStatus.templates.status.${template.status}` as const
}

function WhatsAppMetaStatus() {
    const { t } = useTranslation(["whatsapp", "common"])
    const templates = whatsappSettingsApi.useGetWhatsAppTemplatesStatusQuery()
    const number = whatsappSettingsApi.useGetWhatsAppNumberMetaStatusQuery()
    const updating = templates.isFetching || number.isFetching
    const templatesReason = templates.isError ? connectionReasonOf(templates.error) : null
    const numberReason = number.isError ? connectionReasonOf(number.error) : null
    const templatesCheckedAt = dateTimePartsOf(templates.currentData?.checkedAt ?? null)
    const numberCheckedAt = dateTimePartsOf(number.currentData?.checkedAt ?? null)
    const limit = number.currentData?.messagingLimit
    const usagePercent =
        limit?.dailyLimit && limit.dailyLimit > 0
            ? Math.min(100, (limit.usedLast24h / limit.dailyLimit) * 100)
            : null

    return (
        <>
            <section className={css.listCard}>
                <div className={css.metaHeader}>
                    <h2 className={css.sectionTitle}>{t("metaStatus.templates.heading")}</h2>
                    <button
                        type="button"
                        className={css.refreshButton}
                        disabled={updating}
                        aria-busy={updating || undefined}
                        onClick={() => {
                            void templates.refetch()
                            void number.refetch()
                        }}
                    >
                        {t("metaStatus.refresh")}
                    </button>
                </div>
                {templates.isLoading ? <p className={css.note}>{t("common:loading")}</p> : null}
                {templates.isError ? (
                    <p role="alert" className={css.warning}>
                        {templatesReason
                            ? t(`reasons.${templatesReason}`)
                            : t("metaStatus.loadFailed")}
                    </p>
                ) : null}
                {templates.currentData ? (
                    <>
                        <p className={css.note}>
                            {t("metaStatus.checkedAt", {
                                date: templatesCheckedAt?.date ?? t("unknownDate"),
                                time: templatesCheckedAt?.time ?? ""
                            })}
                        </p>
                        <ul className={css.metaList}>
                            {templates.currentData.templates.map((template) => (
                                <li
                                    key={`${template.kind}-${template.name}-${template.languageCode}`}
                                >
                                    <div className={css.metaTemplate}>
                                        <span>
                                            {t(`metaStatus.templates.kind.${template.kind}`)}
                                        </span>
                                        <strong>{t(statusLabelKey(template))}</strong>
                                    </div>
                                    {template.status === "OTHER" && template.metaStatus ? (
                                        <p className={css.note}>
                                            {t("metaStatus.templates.metaStatus", {
                                                status: template.metaStatus
                                            })}
                                        </p>
                                    ) : null}
                                    {template.status !== "APPROVED" ? (
                                        <p role="alert" className={css.warning}>
                                            {t(`metaStatus.templates.notApproved.${template.kind}`)}
                                        </p>
                                    ) : null}
                                </li>
                            ))}
                            {templates.currentData.templates.length === 0 ? (
                                <li className={css.empty}>{t("metaStatus.templates.empty")}</li>
                            ) : null}
                        </ul>
                    </>
                ) : null}
            </section>
            <section className={css.listCard}>
                <h2 className={css.sectionTitle}>{t("metaStatus.number.heading")}</h2>
                {number.isLoading ? <p className={css.note}>{t("common:loading")}</p> : null}
                {number.isError ? (
                    <p role="alert" className={css.warning}>
                        {numberReason ? t(`reasons.${numberReason}`) : t("metaStatus.loadFailed")}
                    </p>
                ) : null}
                {number.currentData ? (
                    <>
                        <p className={css.note}>
                            {t("metaStatus.checkedAt", {
                                date: numberCheckedAt?.date ?? t("unknownDate"),
                                time: numberCheckedAt?.time ?? ""
                            })}
                        </p>
                        <dl className={css.metaStats}>
                            <div>
                                <dt>{t("metaStatus.number.qualityLabel")}</dt>
                                <dd>
                                    {t(
                                        `metaStatus.number.quality.${number.currentData.qualityRating}`
                                    )}
                                </dd>
                                <dd className={css.note}>
                                    {t(
                                        `metaStatus.number.qualityDescription.${number.currentData.qualityRating}`
                                    )}
                                </dd>
                            </div>
                            <div>
                                <dt>{t("metaStatus.number.limitLabel")}</dt>
                                <dd>
                                    {limit?.dailyLimit === null || limit?.dailyLimit === undefined
                                        ? t("metaStatus.number.limitUnknown")
                                        : t("metaStatus.number.dailyLimit", {
                                              count: limit.dailyLimit,
                                              tier: limit.tier ?? t("metaStatus.number.tierUnknown")
                                          })}
                                </dd>
                                <dd>
                                    {t("metaStatus.number.used", {
                                        count: limit?.usedLast24h ?? 0
                                    })}
                                </dd>
                                {usagePercent !== null ? (
                                    <dd>
                                        <progress
                                            className={css.usageProgress}
                                            max={100}
                                            value={usagePercent}
                                            aria-label={t("metaStatus.number.usageProgress")}
                                        />
                                    </dd>
                                ) : null}
                                {usagePercent !== null && usagePercent > 80 ? (
                                    <dd role="alert" className={css.warning}>
                                        {t("metaStatus.number.nearLimit")}
                                    </dd>
                                ) : null}
                            </div>
                        </dl>
                    </>
                ) : null}
            </section>
        </>
    )
}

export default WhatsAppMetaStatus
