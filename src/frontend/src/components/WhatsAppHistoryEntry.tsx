import { useTranslation } from "react-i18next"
import type WhatsAppHistoryItem from "@/types/whatsapp/WhatsAppHistoryItem.types"
import dateTimePartsOf from "@/utils/dateTimePartsOf"
import css from "@/styles/components/whatsappActivity.module.css"

type Props = { entry: WhatsAppHistoryItem }

function WhatsAppHistoryEntry({ entry }: Props) {
    const { t } = useTranslation(["whatsapp", "common"])
    const parts = dateTimePartsOf(entry.createdAt)
    const fields = entry.fields
        .map((field) => t(`history.field.${field}`, { defaultValue: "" }))
        .filter(Boolean)
        .join(", ")

    return (
        <li className={css.activityItem}>
            <div className={css.activityMain}>
                <span>
                    {t(`history.action.${entry.action}`, {
                        defaultValue: t("history.action.other")
                    })}
                </span>
                {entry.fields.length > 0 ? (
                    <span className={css.activityDetail}>{t("history.fields", { fields })}</span>
                ) : null}
            </div>
            <span className={css.activityMeta}>
                <span>{entry.actor?.name ?? t("history.unknownActor")}</span>
                <time dateTime={entry.createdAt}>
                    {parts ? t("dateTime", parts) : t("unknownDate")}
                </time>
            </span>
        </li>
    )
}

export default WhatsAppHistoryEntry
