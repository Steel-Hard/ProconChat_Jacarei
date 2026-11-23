import { useTranslation } from "react-i18next"
import useWhatsAppMetaStatus from "@/pages/hooks/useWhatsAppMetaStatus"
import type WhatsAppNumberMetaStatus from "@/types/whatsapp/WhatsAppNumberMetaStatus.types"
import css from "@/styles/components/whatsappActivity.module.css"

type Rating = WhatsAppNumberMetaStatus["qualityRating"]

const BANDS: Exclude<Rating, "UNKNOWN">[] = ["HIGH", "MEDIUM", "LOW"]
const NEAR_LIMIT_PERCENT = 80
const numberFormat = new Intl.NumberFormat("pt-BR")

function WhatsAppNumberMeta() {
    const { t } = useTranslation(["whatsapp", "common"])
    const { number } = useWhatsAppMetaStatus()
    const checked = t("metaStatus.checkedAt", {
        date: number.checkedAt?.date ?? t("unknownDate"),
        time: number.checkedAt?.time ?? ""
    })
    const limit = number.limit

    return (
        <>
            <dl className={css.statusBlock}>
                <dt className={css.statusLabel}>{t("metaStatus.number.qualityLabel")}</dt>
                {number.loading ? <dd className={css.note}>{t("common:loading")}</dd> : null}
                {number.failed ? (
                    <dd role="alert" className={css.warning}>
                        {number.reason ? t(`reasons.${number.reason}`) : t("metaStatus.loadFailed")}
                    </dd>
                ) : null}
                {number.data ? (
                    <>
                        {BANDS.map((band) => (
                            <dd
                                key={band}
                                className={css.qualityBand}
                                data-current={number.data?.qualityRating === band}
                            >
                                <span className={css.qualityPill}>
                                    {t(`metaStatus.number.quality.${band}`)}
                                </span>
                                <span>{t(`metaStatus.number.qualityDescription.${band}`)}</span>
                            </dd>
                        ))}
                        {number.data.qualityRating === "UNKNOWN" ? (
                            <dd className={css.note}>
                                {t("metaStatus.number.qualityDescription.UNKNOWN")}
                            </dd>
                        ) : null}
                        <dd className={css.note}>{checked}</dd>
                    </>
                ) : null}
            </dl>
            <dl className={`${css.statusBlock} ${css.limitBlock}`}>
                <dt className={css.statusLabel}>{t("metaStatus.number.limitLabel")}</dt>
                {limit?.kind === "limited" ? (
                    <>
                        <dd className={css.limitTotal}>
                            {t("metaStatus.number.dailyLimit", {
                                total: numberFormat.format(limit.total)
                            })}
                        </dd>
                        <dd className={css.note}>
                            {t("metaStatus.number.used", {
                                used: numberFormat.format(limit.used),
                                total: numberFormat.format(limit.total)
                            })}
                        </dd>
                        <dd>
                            <progress
                                className={
                                    limit.percent > NEAR_LIMIT_PERCENT
                                        ? `${css.usageProgress} ${css.usageProgressDanger}`
                                        : css.usageProgress
                                }
                                max={100}
                                value={limit.percent}
                                aria-label={t("metaStatus.number.usageProgress")}
                            />
                        </dd>
                        {limit.percent > NEAR_LIMIT_PERCENT ? (
                            <dd role="alert" className={css.warning}>
                                {t("metaStatus.number.nearLimit")}
                            </dd>
                        ) : null}
                    </>
                ) : null}
                {limit?.kind === "unlimited" ? (
                    <dd className={css.limitTotal}>{t("metaStatus.number.unlimited")}</dd>
                ) : null}
                {limit?.kind === "unknown" ? (
                    <dd className={css.limitTotal}>{t("metaStatus.number.limitUnknown")}</dd>
                ) : null}
            </dl>
        </>
    )
}

export default WhatsAppNumberMeta
