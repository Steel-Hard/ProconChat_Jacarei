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
            <div>
                <strong>{t(`deliveryFailures.kind.${failure.kind}`)}</strong>
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
            <time dateTime={failure.failedAt}>
                {parts ? t("dateTime", parts) : t("unknownDate")}
            </time>
        </li>
    )
}

export default WhatsAppDeliveryFailureItem
