import { useTranslation } from "react-i18next"
import ScheduleContentNotice from "@/components/ScheduleContentNotice"
import ScheduleDayRow from "@/components/ScheduleDayRow"
import type RangeField from "@/types/schedule/RangeField.types"
import type ScheduleDayView from "@/types/schedule/ScheduleDayView.types"
import css from "@/styles/components/scheduleForm.module.css"

type ScheduleWeekGridProps = {
    days: ScheduleDayView[]
    showContentLink: boolean
    onToggleDay: (weekday: number) => void
    onChangeRange: (weekday: number, index: number, field: RangeField, value: string) => void
    onRemoveRange: (weekday: number, index: number) => void
    onAddRange: (weekday: number) => void
}

function ScheduleWeekGrid({
    days,
    showContentLink,
    onToggleDay,
    onChangeRange,
    onRemoveRange,
    onAddRange
}: ScheduleWeekGridProps) {
    const { t } = useTranslation("schedule")

    return (
        <section className={css.section}>
            <h2 className={css.sectionTitle}>{t("grid.title")}</h2>
            <ScheduleContentNotice showLink={showContentLink} />
            <ul className={css.days}>
                {days.map((day) => (
                    <ScheduleDayRow
                        key={day.weekday}
                        day={day}
                        onToggle={onToggleDay}
                        onChangeRange={onChangeRange}
                        onRemoveRange={onRemoveRange}
                        onAddRange={onAddRange}
                    />
                ))}
            </ul>
        </section>
    )
}

export default ScheduleWeekGrid
