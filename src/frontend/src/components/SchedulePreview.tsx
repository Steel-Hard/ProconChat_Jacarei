import { useId } from "react"
import { useTranslation } from "react-i18next"
import SchedulePreviewDay from "@/components/SchedulePreviewDay"
import SchedulePreviewDetail from "@/components/SchedulePreviewDetail"
import SchedulePreviewLegendItem from "@/components/SchedulePreviewLegendItem"
import SchedulePreviewWeekday from "@/components/SchedulePreviewWeekday"
import type BookedDay from "@/types/schedule/BookedDay.types"
import type MonthlyPreview from "@/types/schedule/MonthlyPreview.types"
import formatDate from "@/utils/formatDate"
import monthTitle from "@/utils/schedule/monthTitle"
import WEEKDAY_KEYS from "@/utils/schedule/weekdayKeys"
import WEEKDAY_ORDER from "@/utils/schedule/weekdayOrder"
import css from "@/styles/components/schedulePreview.module.css"

type SchedulePreviewProps = {
    preview: MonthlyPreview | null
    month: string | null
    updating: boolean
    bookedDays: BookedDay[]
    selectedDate: string | null
    loading: boolean
    failed: boolean
    stale: boolean
    onShiftMonth: (delta: number) => void
    onSelectDay: (date: string) => void
}

const LEGEND = [
    ["available", "AVAILABLE"],
    ["full", "FULL"],
    ["beforeMinNotice", "BEFORE_MIN_NOTICE"],
    ["blocked", "BLOCKED"],
    ["closed", "NO_SERVICE"]
] as const

function SchedulePreview({
    preview,
    month,
    updating,
    bookedDays,
    selectedDate,
    loading,
    failed,
    stale,
    onShiftMonth,
    onSelectDay
}: SchedulePreviewProps) {
    const { t } = useTranslation("schedule")
    const titleId = useId()
    const bookedByDate = new Map(bookedDays.map((day) => [day.date, day]))
    const days = preview?.days ?? []
    const selected =
        days.find((day) => day.date === selectedDate) ??
        days.find((day) => day.status === "AVAILABLE") ??
        days[0]
    const leading = days.length > 0 ? days[0].weekday : 0

    return (
        <section
            className={css.preview}
            aria-labelledby={titleId}
            aria-busy={updating || undefined}
        >
            <div className={css.header}>
                <h2 id={titleId} className={css.title}>
                    {t("preview.title")}
                </h2>
                {preview ? (
                    <span className={css.total}>
                        {t("preview.windowTotal", {
                            free: preview.freeWindowSeats,
                            total: preview.totalWindowSeats
                        })}
                    </span>
                ) : null}
            </div>
            {preview ? (
                <p className={css.subtitle}>
                    {t("preview.subtitle", {
                        start: formatDate(preview.windowStart) ?? preview.windowStart,
                        end: formatDate(preview.windowEnd) ?? preview.windowEnd
                    })}
                </p>
            ) : null}
            {stale ? <p className={css.notice}>{t("preview.stale")}</p> : null}
            {failed ? (
                <p role="alert" className={css.alert}>
                    {t("preview.failed")}
                </p>
            ) : null}
            {loading && !preview ? <p className={css.note}>{t("preview.loading")}</p> : null}
            {updating ? <output className={css.updating}>{t("preview.updating")}</output> : null}
            {preview ? (
                <>
                    <div className={css.monthNav}>
                        <button
                            type="button"
                            className={css.navButton}
                            aria-label={t("preview.previousMonth")}
                            title={t("preview.previousMonth")}
                            onClick={() => onShiftMonth(-1)}
                        >
                            {t("preview.previousSymbol")}
                        </button>
                        <span className={css.month}>{monthTitle(month ?? preview.month)}</span>
                        <button
                            type="button"
                            className={css.navButton}
                            aria-label={t("preview.nextMonth")}
                            title={t("preview.nextMonth")}
                            onClick={() => onShiftMonth(1)}
                        >
                            {t("preview.nextSymbol")}
                        </button>
                    </div>
                    <div className={updating ? `${css.grid} ${css.gridUpdating}` : css.grid}>
                        {WEEKDAY_KEYS.map((key) => (
                            <span key={key} className={css.weekdayHead}>
                                {t(`preview.weekdayShort.${key}`)}
                            </span>
                        ))}
                        {Array.from({ length: leading }, (_, index) => (
                            <span key={`blank-${index}`} aria-hidden="true" />
                        ))}
                        {days.map((day) => (
                            <SchedulePreviewDay
                                key={day.date}
                                day={day}
                                booked={bookedByDate.get(day.date)}
                                selected={day.date === selected?.date}
                                onSelect={onSelectDay}
                            />
                        ))}
                    </div>
                    <ul className={css.legend}>
                        {LEGEND.map(([key, status]) => (
                            <SchedulePreviewLegendItem
                                key={key}
                                label={t(`preview.legend.${key}`)}
                                status={status}
                            />
                        ))}
                    </ul>
                    {selected ? (
                        <SchedulePreviewDetail
                            day={selected}
                            booked={bookedByDate.get(selected.date)}
                        />
                    ) : null}
                    <div className={css.weekdays}>
                        <h3 className={css.weekdaysTitle}>{t("preview.weekdaySummary.title")}</h3>
                        <ul className={css.weekdayList}>
                            {WEEKDAY_ORDER.map((weekday) => (
                                <SchedulePreviewWeekday
                                    key={weekday}
                                    weekday={weekday}
                                    summary={preview.weekdays.find(
                                        (item) => item.weekday === weekday
                                    )}
                                />
                            ))}
                        </ul>
                    </div>
                </>
            ) : null}
        </section>
    )
}

export default SchedulePreview
