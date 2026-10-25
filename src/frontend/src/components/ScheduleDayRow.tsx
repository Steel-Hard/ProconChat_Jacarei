import { useId } from "react"
import { useTranslation } from "react-i18next"
import ScheduleFieldMessages from "@/components/ScheduleFieldMessages"
import ScheduleRangeField from "@/components/ScheduleRangeField"
import type RangeField from "@/types/schedule/RangeField.types"
import type ScheduleDayView from "@/types/schedule/ScheduleDayView.types"
import WEEKDAY_KEYS from "@/utils/schedule/weekdayKeys"
import css from "@/styles/components/scheduleForm.module.css"

type ScheduleDayRowProps = {
    day: ScheduleDayView
    onToggle: (weekday: number) => void
    onChangeRange: (weekday: number, index: number, field: RangeField, value: string) => void
    onRemoveRange: (weekday: number, index: number) => void
    onAddRange: (weekday: number) => void
}

function ScheduleDayRow({
    day,
    onToggle,
    onChangeRange,
    onRemoveRange,
    onAddRange
}: ScheduleDayRowProps) {
    const { t } = useTranslation("schedule")
    const lockId = useId()
    const messagesId = useId()
    const name = t(`weekdays.${WEEKDAY_KEYS[day.weekday]}`)
    const locked = day.lockedReason !== null
    const describedBy = [day.lockedReason ? lockId : null, day.messages.length ? messagesId : null]
        .filter(Boolean)
        .join(" ")

    return (
        <li className={css.dayRow}>
            <label className={css.dayLabel}>
                <input
                    type="checkbox"
                    className={css.checkbox}
                    checked={day.enabled}
                    aria-disabled={locked || undefined}
                    aria-describedby={describedBy || undefined}
                    onChange={() => {
                        if (!locked) {
                            onToggle(day.weekday)
                        }
                    }}
                />
                {name}
            </label>
            <div className={css.dayBody}>
                <div className={css.ranges}>
                    {day.enabled ? null : (
                        <span className={css.noService}>{t("grid.noService")}</span>
                    )}
                    {day.enabled
                        ? day.ranges.map((range, index) => (
                              <ScheduleRangeField
                                  key={index}
                                  range={range}
                                  day={name}
                                  position={index + 1}
                                  onChange={(field, value) =>
                                      onChangeRange(day.weekday, index, field, value)
                                  }
                                  onRemove={() => onRemoveRange(day.weekday, index)}
                              />
                          ))
                        : null}
                    {day.canAdd ? (
                        <button
                            type="button"
                            className={css.addRange}
                            aria-label={t("grid.addRangeLabel", { day: name })}
                            onClick={() => onAddRange(day.weekday)}
                        >
                            {t("grid.addRange")}
                        </button>
                    ) : null}
                </div>
                {day.lockedReason ? (
                    <p id={lockId} className={css.lock}>
                        {day.lockedReason}
                    </p>
                ) : null}
                <ScheduleFieldMessages id={messagesId} messages={day.messages} />
            </div>
        </li>
    )
}

export default ScheduleDayRow
