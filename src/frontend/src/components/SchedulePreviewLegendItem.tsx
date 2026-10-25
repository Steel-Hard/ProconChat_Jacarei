import SCHEDULE_PREVIEW_STATUS from "@/status/schedulePreviewStatusStyles"
import type DayPreviewStatus from "@/types/schedule/DayPreviewStatus.types"
import css from "@/styles/components/schedulePreview.module.css"

type SchedulePreviewLegendItemProps = {
    label: string
    status: DayPreviewStatus
}

function SchedulePreviewLegendItem({ label, status }: SchedulePreviewLegendItemProps) {
    const style = SCHEDULE_PREVIEW_STATUS[status]

    return (
        <li className={css.legendItem}>
            <i
                className={css.swatch}
                style={{ background: style.bg, borderColor: style.border }}
                aria-hidden="true"
            />
            {label}
        </li>
    )
}

export default SchedulePreviewLegendItem
