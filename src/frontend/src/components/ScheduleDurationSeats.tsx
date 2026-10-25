import { useId } from "react"
import { useTranslation } from "react-i18next"
import ScheduleFieldMessages from "@/components/ScheduleFieldMessages"
import ScheduleNumberField from "@/components/ScheduleNumberField"
import type SlotMinutes from "@/types/schedule/SlotMinutes.types"
import css from "@/styles/components/scheduleForm.module.css"

type ScheduleDurationSeatsProps = {
    slotMinutes: SlotMinutes
    seatsPerSlot: string
    durationMessages: string[]
    seatsMessages: string[]
    onChangeSlotMinutes: (value: SlotMinutes) => void
    onChangeSeats: (value: string) => void
}

const SLOT_MINUTES: SlotMinutes[] = [20, 30, 40, 60]

function isSlotMinutes(value: number): value is SlotMinutes {
    return SLOT_MINUTES.some((option) => option === value)
}

function ScheduleDurationSeats({
    slotMinutes,
    seatsPerSlot,
    durationMessages,
    seatsMessages,
    onChangeSlotMinutes,
    onChangeSeats
}: ScheduleDurationSeatsProps) {
    const { t } = useTranslation("schedule")
    const selectId = useId()
    const messagesId = useId()
    const invalid = durationMessages.length > 0

    return (
        <section className={`${css.section} ${css.twoColumns}`}>
            <div className={css.field}>
                <label htmlFor={selectId} className={css.label}>
                    {t("durationSeats.duration")}
                </label>
                <select
                    id={selectId}
                    className={invalid ? `${css.select} ${css.inputInvalid}` : css.select}
                    value={slotMinutes}
                    aria-invalid={invalid || undefined}
                    aria-describedby={invalid ? messagesId : undefined}
                    onChange={(event) => {
                        const value = Number(event.target.value)

                        if (isSlotMinutes(value)) {
                            onChangeSlotMinutes(value)
                        }
                    }}
                >
                    {SLOT_MINUTES.map((option) => (
                        <option key={option} value={option}>
                            {t("durationSeats.minutes", { count: option })}
                        </option>
                    ))}
                </select>
                <ScheduleFieldMessages id={messagesId} messages={durationMessages} />
            </div>
            <ScheduleNumberField
                label={t("durationSeats.seats")}
                value={seatsPerSlot}
                min={1}
                max={20}
                messages={seatsMessages}
                onChange={onChangeSeats}
            />
        </section>
    )
}

export default ScheduleDurationSeats
