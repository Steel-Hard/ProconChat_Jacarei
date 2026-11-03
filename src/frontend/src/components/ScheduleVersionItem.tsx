import { useTranslation } from "react-i18next"
import css from "@/styles/components/scheduleVersions.module.css"
import formatDate from "@/utils/formatDate"

type ScheduleVersionItemProps = {
    effectiveFrom: string
    onEdit: (effectiveFrom: string) => void
    onCancel: (effectiveFrom: string) => void
}

function ScheduleVersionItem({ effectiveFrom, onEdit, onCancel }: ScheduleVersionItemProps) {
    const { t } = useTranslation("schedule")
    const date = formatDate(effectiveFrom) ?? effectiveFrom

    return (
        <li className={css.item}>
            <span>{date}</span>
            <button
                type="button"
                className={css.button}
                aria-label={t("versions.editLabel", { date })}
                onClick={() => onEdit(effectiveFrom)}
            >
                {t("versions.edit")}
            </button>
            <button
                type="button"
                className={css.button}
                aria-label={t("versions.cancelLabel", { date })}
                onClick={() => onCancel(effectiveFrom)}
            >
                {t("versions.cancel")}
            </button>
        </li>
    )
}

export default ScheduleVersionItem
