import { useId } from "react"
import { useTranslation } from "react-i18next"
import ScheduleFieldMessages from "@/components/ScheduleFieldMessages"
import type ScheduleBlockedDateView from "@/types/schedule/ScheduleBlockedDateView.types"
import formatDate from "@/utils/formatDate"
import weekdayOfDate from "@/utils/schedule/weekdayOfDate"
import WEEKDAY_KEYS from "@/utils/schedule/weekdayKeys"
import css from "@/styles/components/scheduleForm.module.css"

type ScheduleBlockedDateItemProps = {
    block: ScheduleBlockedDateView
    onRemove: (index: number) => void
}

function ScheduleBlockedDateItem({ block, onRemove }: ScheduleBlockedDateItemProps) {
    const { t } = useTranslation("schedule")
    const messagesId = useId()
    const date = formatDate(block.date) ?? block.date
    const period =
        block.startTime && block.endTime
            ? t("blocked.period", { start: block.startTime, end: block.endTime })
            : t("blocked.fullDay")

    return (
        <li
            className={css.blockRow}
            aria-describedby={block.messages.length ? messagesId : undefined}
        >
            <div>
                <div className={css.blockDate}>{date}</div>
                <div className={css.blockWeekday}>
                    {t(`weekdays.${WEEKDAY_KEYS[weekdayOfDate(block.date)]}`)}
                </div>
            </div>
            <div className={css.blockBody}>
                <div className={css.blockDescription}>{block.description}</div>
                <div className={block.startTime ? css.blockPartial : css.blockPeriod}>{period}</div>
                <ScheduleFieldMessages id={messagesId} messages={block.messages} />
            </div>
            <button
                type="button"
                className={css.secondaryButton}
                aria-label={t("blocked.removeLabel", { date })}
                onClick={() => onRemove(block.index)}
            >
                {t("blocked.remove")}
            </button>
        </li>
    )
}

export default ScheduleBlockedDateItem
