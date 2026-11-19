import { useId } from "react"
import { useTranslation } from "react-i18next"
import ScheduleBlockedDateItem from "@/components/ScheduleBlockedDateItem"
import type ScheduleBlockedDateView from "@/types/schedule/ScheduleBlockedDateView.types"
import css from "@/styles/components/scheduleForm.module.css"

type ScheduleBlockedDatesProps = {
    blocks: ScheduleBlockedDateView[]
    newDate: string
    newDescription: string
    newFullDay: boolean
    newStartTime: string
    newEndTime: string
    newError: string | null
    onChangeNewDate: (value: string) => void
    onChangeNewDescription: (value: string) => void
    onChangeNewFullDay: (value: boolean) => void
    onChangeNewStartTime: (value: string) => void
    onChangeNewEndTime: (value: string) => void
    onAdd: () => void
    onRemove: (index: number) => void
}

function ScheduleBlockedDates({
    blocks,
    newDate,
    newDescription,
    newFullDay,
    newStartTime,
    newEndTime,
    newError,
    onChangeNewDate,
    onChangeNewDescription,
    onChangeNewFullDay,
    onChangeNewStartTime,
    onChangeNewEndTime,
    onAdd,
    onRemove
}: ScheduleBlockedDatesProps) {
    const { t } = useTranslation("schedule")
    const dateId = useId()
    const descriptionId = useId()
    const fullDayId = useId()
    const startTimeId = useId()
    const endTimeId = useId()
    const errorId = useId()
    const invalid = newError !== null
    const periodInvalid =
        newError === t("blocked.problems.periodRequired") ||
        newError === t("blocked.problems.periodInvalid")

    return (
        <section className={css.section}>
            <h2 className={css.sectionTitle}>{t("blocked.title")}</h2>
            <p className={css.sectionDescription}>{t("blocked.description")}</p>
            {blocks.length > 0 ? (
                <ul className={css.blocks}>
                    {blocks.map((block) => (
                        <ScheduleBlockedDateItem
                            key={block.index}
                            block={block}
                            onRemove={onRemove}
                        />
                    ))}
                </ul>
            ) : (
                <p className={css.empty}>{t("blocked.empty")}</p>
            )}
            <div className={css.newBlock}>
                <h3 className={css.newBlockTitle}>{t("blocked.newTitle")}</h3>
                <div className={css.newBlockFields}>
                    <div className={css.field}>
                        <label htmlFor={dateId} className={css.label}>
                            {t("blocked.newDate")}
                        </label>
                        <input
                            id={dateId}
                            type="date"
                            className={css.textInput}
                            value={newDate}
                            aria-invalid={invalid || undefined}
                            aria-describedby={invalid ? errorId : undefined}
                            onChange={(event) => onChangeNewDate(event.target.value)}
                        />
                    </div>
                    <div className={css.field}>
                        <label htmlFor={descriptionId} className={css.label}>
                            {t("blocked.newDescription")}
                        </label>
                        <input
                            id={descriptionId}
                            className={css.textInput}
                            value={newDescription}
                            placeholder={t("blocked.newDescriptionPlaceholder")}
                            aria-invalid={invalid || undefined}
                            aria-describedby={invalid ? errorId : undefined}
                            onChange={(event) => onChangeNewDescription(event.target.value)}
                        />
                    </div>
                    <button type="button" className={css.addBlock} onClick={onAdd}>
                        {t("blocked.add")}
                    </button>
                </div>
                <label htmlFor={fullDayId} className={css.fullDayToggle}>
                    <input
                        id={fullDayId}
                        type="checkbox"
                        className={css.checkbox}
                        checked={newFullDay}
                        onChange={(event) => onChangeNewFullDay(event.target.checked)}
                    />
                    {t("blocked.fullDayToggle")}
                </label>
                {!newFullDay ? (
                    <div className={css.periodFields}>
                        <div className={css.field}>
                            <label htmlFor={startTimeId} className={css.label}>
                                {t("blocked.startTime")}
                            </label>
                            <input
                                id={startTimeId}
                                type="time"
                                className={css.textInput}
                                value={newStartTime}
                                aria-invalid={periodInvalid || undefined}
                                aria-describedby={periodInvalid ? errorId : undefined}
                                onChange={(event) => onChangeNewStartTime(event.target.value)}
                            />
                        </div>
                        <div className={css.field}>
                            <label htmlFor={endTimeId} className={css.label}>
                                {t("blocked.endTime")}
                            </label>
                            <input
                                id={endTimeId}
                                type="time"
                                className={css.textInput}
                                value={newEndTime}
                                aria-invalid={periodInvalid || undefined}
                                aria-describedby={periodInvalid ? errorId : undefined}
                                onChange={(event) => onChangeNewEndTime(event.target.value)}
                            />
                        </div>
                    </div>
                ) : null}
                {invalid ? (
                    <p id={errorId} role="alert" className={css.rangeError}>
                        {newError}
                    </p>
                ) : null}
            </div>
        </section>
    )
}

export default ScheduleBlockedDates
