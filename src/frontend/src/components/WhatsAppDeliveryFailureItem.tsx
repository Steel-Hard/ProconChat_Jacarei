import { useTranslation } from "react-i18next"
import type WhatsAppDeliveryFailure from "@/types/whatsapp/WhatsAppDeliveryFailure.types"
import dateTimePartsOf from "@/utils/dateTimePartsOf"
import css from "@/styles/components/whatsappActivity.module.css"

type Props = { failure: WhatsAppDeliveryFailure }

function WhatsAppDeliveryFailureItem({ failure }: Props) {
    const { t } = useTranslation(["whatsapp", "common"])
    const parts = dateTimePartsOf(failure.failedAt)

    return (
        <li className={css.activityItem}>
            <div className={css.activityMain}>
                <span>{t(`deliveryFailures.kind.${failure.kind}`)}</span>
                {failure.errorCode ? (
                    <span className={css.activityDetail}>
                        {t("deliveryFailures.errorCode", { code: failure.errorCode })}
                    </span>
                ) : null}
                {failure.appointmentId ? (
                    <span className={css.activityDetail}>
                        {t("deliveryFailures.appointment", { id: failure.appointmentId })}
                    </span>
                ) : null}
            </div>
            <span className={css.activityMeta}>
                <time dateTime={failure.failedAt}>
                    {parts ? t("dateTime", parts) : t("unknownDate")}
                </time>
            </span>
        </li>
    )
}

export default WhatsAppDeliveryFailureItem
