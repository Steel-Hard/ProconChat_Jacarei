import { useTranslation } from "react-i18next"
import SCHEDULE_PREVIEW_STATUS from "@/status/schedulePreviewStatusStyles"
import type BookedDay from "@/types/schedule/BookedDay.types"
import type DayPreview from "@/types/schedule/DayPreview.types"
import dayMonthOf from "@/utils/schedule/dayMonthOf"
import css from "@/styles/components/schedulePreview.module.css"

type SchedulePreviewDayProps = {
    day: DayPreview
    booked: BookedDay | undefined
    selected: boolean
    onSelect: (date: string) => void
}

function SchedulePreviewDay({ day, booked, selected, onSelect }: SchedulePreviewDayProps) {
    const { t } = useTranslation("schedule")
    const style = SCHEDULE_PREVIEW_STATUS[day.status]
    const status = t(`preview.cellStatus.${day.status}`, {
        count: day.freeSeats,
        description: day.blockDescription ?? ""
    })
    const date = dayMonthOf(day.date)
    const label = booked
        ? t("preview.cellLabelBooked", {
              date,
              status,
              booked: t("preview.booked", { count: booked.total })
          })
        : t("preview.cellLabel", { date, status })
    const mark =
        day.status === "AVAILABLE"
            ? String(day.freeSeats)
            : day.status === "FULL"
              ? t("preview.full")
              : day.status === "BLOCKED"
                ? t("preview.blockedSymbol")
                : ""

    return (
        <button
            type="button"
            className={selected ? `${css.cell} ${css.cellSelected}` : css.cell}
            style={{ background: style.bg, color: style.fg, borderColor: style.border }}
            title={label}
            aria-label={label}
            aria-pressed={selected}
            onClick={() => onSelect(day.date)}
        >
            <span className={css.cellNumber}>{Number(day.date.slice(8, 10))}</span>
            {booked ? (
                <span className={css.cellBooked} aria-hidden="true">
                    {t("preview.booked", { count: booked.total })}
                </span>
            ) : null}
            <span className={css.cellMark} aria-hidden="true">
                {mark}
            </span>
        </button>
    )
}

export default SchedulePreviewDay
