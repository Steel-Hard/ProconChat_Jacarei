import { useTranslation } from "react-i18next"
import WhatsAppHistoryEntry from "@/components/WhatsAppHistoryEntry"
import type WhatsAppActivityStatus from "@/types/whatsapp/WhatsAppActivityStatus.types"
import type WhatsAppHistory from "@/types/whatsapp/WhatsAppHistory.types"
import css from "@/styles/components/whatsappActivity.module.css"

type Props = { status: WhatsAppActivityStatus; history: WhatsAppHistory | null }

function HistoryContent({ status, history }: Props) {
    const { t } = useTranslation(["whatsapp", "common"])

    if (status === "loading") {
        return <p className={css.loading}>{t("common:loading")}</p>
    }

    if (status === "error") {
        return (
            <p className={css.alert} role="alert">
                {t("history.loadFailed")}
            </p>
        )
    }

    if (history === null) {
        return null
    }

    if (history.items.length === 0) {
        return <p className={css.empty}>{t("history.empty")}</p>
    }

    return (
        <ul className={css.activityList}>
            {history.items.map((item) => (
                <WhatsAppHistoryEntry key={item.id} entry={item} />
            ))}
        </ul>
    )
}

function WhatsAppSettingsHistory({ status, history }: Props) {
    const { t } = useTranslation(["whatsapp", "common"])

    return (
        <section className={css.listCard} aria-labelledby="whatsapp-settings-history">
            <h2 className={css.sectionTitle} id="whatsapp-settings-history">
                {t("history.heading")}
            </h2>
            <p className={css.note}>{t("history.note")}</p>
            <HistoryContent status={status} history={history} />
        </section>
    )
}

export default WhatsAppSettingsHistory
