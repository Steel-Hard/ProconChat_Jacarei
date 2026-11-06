import { useTranslation } from "react-i18next"
import WhatsAppDeliveryFailureItem from "@/components/WhatsAppDeliveryFailureItem"
import type WhatsAppActivityStatus from "@/types/whatsapp/WhatsAppActivityStatus.types"
import type DeliveryFailures from "@/types/whatsapp/WhatsAppDeliveryFailures.types"
import css from "@/styles/components/whatsappActivity.module.css"

type Props = { status: WhatsAppActivityStatus; failures: DeliveryFailures | null }

function FailuresContent({ status, failures }: Props) {
    const { t } = useTranslation(["whatsapp", "common"])

    if (status === "loading") {
        return <p className={css.loading}>{t("common:loading")}</p>
    }

    if (status === "error") {
        return (
            <p className={css.alert} role="alert">
                {t("deliveryFailures.loadFailed")}
            </p>
        )
    }

    if (failures === null) {
        return null
    }

    return (
        <>
            <p className={css.countValue}>
                {t("deliveryFailures.count", { count: failures.count })}
            </p>
            {failures.items.length === 0 ? (
                <p className={css.empty}>{t("deliveryFailures.empty")}</p>
            ) : (
                <ul className={css.activityList}>
                    {failures.items.map((item) => (
                        <WhatsAppDeliveryFailureItem key={item.id} failure={item} />
                    ))}
                </ul>
            )}
        </>
    )
}

function WhatsAppDeliveryFailures({ status, failures }: Props) {
    const { t } = useTranslation(["whatsapp", "common"])

    return (
        <section className={css.listCard} aria-labelledby="whatsapp-delivery-failures">
            <h2 className={css.sectionTitle} id="whatsapp-delivery-failures">
                {t("deliveryFailures.heading")}
            </h2>
            <FailuresContent status={status} failures={failures} />
        </section>
    )
}

export default WhatsAppDeliveryFailures
