import { useId } from "react"
import { useTranslation } from "react-i18next"
import type RangeField from "@/types/schedule/RangeField.types"
import type ScheduleRangeView from "@/types/schedule/ScheduleRangeView.types"
import css from "@/styles/components/scheduleForm.module.css"

type ScheduleRangeFieldProps = {
    range: ScheduleRangeView
    day: string
    position: number
    onChange: (field: RangeField, value: string) => void
    onRemove: () => void
}

function ScheduleRangeField({ range, day, position, onChange, onRemove }: ScheduleRangeFieldProps) {
    const { t } = useTranslation("schedule")
    const errorId = useId()
    const invalid = range.error !== null

    return (
        <div className={css.rangeField}>
            <div className={invalid ? `${css.range} ${css.rangeInvalid}` : css.range}>
                <input
                    type="time"
                    className={css.timeInput}
                    value={range.startTime}
                    aria-label={t("grid.start", { position, day })}
                    aria-invalid={invalid || undefined}
                    aria-describedby={invalid ? errorId : undefined}
                    onChange={(event) => onChange("startTime", event.target.value)}
                />
                <span className={css.separator}>{t("grid.separator")}</span>
                <input
                    type="time"
                    className={css.timeInput}
                    value={range.endTime}
                    aria-label={t("grid.end", { position, day })}
                    aria-invalid={invalid || undefined}
                    aria-describedby={invalid ? errorId : undefined}
                    onChange={(event) => onChange("endTime", event.target.value)}
                />
                <button
                    type="button"
                    className={css.removeRange}
                    aria-disabled={range.removeLocked || undefined}
                    aria-label={range.removeLocked ? t("grid.removeLocked") : t("grid.remove")}
                    title={range.removeLocked ? t("grid.removeLocked") : t("grid.remove")}
                    onClick={() => {
                        if (!range.removeLocked) {
                            onRemove()
                        }
                    }}
                >
                    {t("grid.removeSymbol")}
                </button>
            </div>
            {invalid ? (
                <span id={errorId} className={css.rangeError}>
                    {range.error}
                </span>
            ) : null}
        </div>
    )
}

export default ScheduleRangeField
