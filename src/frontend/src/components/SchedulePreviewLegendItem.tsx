import css from "@/styles/components/schedulePreview.module.css"

type SchedulePreviewLegendItemProps = {
    label: string
    swatchClass: string
}

function SchedulePreviewLegendItem({ label, swatchClass }: SchedulePreviewLegendItemProps) {
    return (
        <li className={css.legendItem}>
            <i className={`${css.swatch} ${swatchClass}`} aria-hidden="true" />
            {label}
        </li>
    )
}

export default SchedulePreviewLegendItem
