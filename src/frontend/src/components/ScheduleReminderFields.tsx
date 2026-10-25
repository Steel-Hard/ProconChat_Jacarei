import { useId } from "react"
import { useTranslation } from "react-i18next"
import type ReminderHours from "@/types/schedule/ReminderHours.types"
import css from "@/styles/components/scheduleForm.module.css"

type ScheduleReminderFieldsProps = {
    enabled: boolean
    hours: ReminderHours
    address: string
    complement: string
    onToggle: () => void
    onChangeHours: (value: ReminderHours) => void
}

const REMINDER_HOURS: ReminderHours[] = [2, 6, 12, 24, 48]

function isReminderHours(value: number): value is ReminderHours {
    return REMINDER_HOURS.some((option) => option === value)
}

function ScheduleReminderFields({
    enabled,
    hours,
    address,
    complement,
    onToggle,
    onChangeHours
}: ScheduleReminderFieldsProps) {
    const { t } = useTranslation("schedule")
    const hoursId = useId()
    const trimmedAddress = address.trim()
    const trimmedComplement = complement.trim()
    const unitAddress =
        trimmedAddress === ""
            ? t("reminder.addressMissing")
            : trimmedComplement === ""
              ? trimmedAddress
              : t("reminder.addressWithComplement", {
                    address: trimmedAddress,
                    complement: trimmedComplement
                })

    return (
        <section className={css.section}>
            <div className={css.reminderHeader}>
                <div className={css.reminderText}>
                    <h2 className={css.sectionTitle}>{t("reminder.title")}</h2>
                    <p className={css.sectionDescription}>{t("reminder.description")}</p>
                </div>
                <label className={css.toggle}>
                    <input
                        type="checkbox"
                        className={css.checkbox}
                        checked={enabled}
                        aria-label={t("reminder.toggle")}
                        onChange={onToggle}
                    />
                    {enabled ? t("reminder.on") : t("reminder.off")}
                </label>
            </div>
            {enabled ? (
                <>
                    <div className={css.inline}>
                        <label htmlFor={hoursId} className={css.inlineLabel}>
                            {t("reminder.hoursBefore")}
                        </label>
                        <select
                            id={hoursId}
                            className={css.select}
                            value={hours}
                            onChange={(event) => {
                                const value = Number(event.target.value)

                                if (isReminderHours(value)) {
                                    onChangeHours(value)
                                }
                            }}
                        >
                            {REMINDER_HOURS.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                        <span className={css.suffix}>{t("reminder.hoursSuffix")}</span>
                    </div>
                    <div className={css.reminderPreview}>
                        <div className={css.reminderPreviewHeader}>
                            <span className={css.label}>{t("reminder.previewTitle")}</span>
                            <span className={css.fixed}>{t("reminder.fixed")}</span>
                        </div>
                        <p className={css.message}>
                            {t("reminder.message", { address: unitAddress })}
                        </p>
                        <p className={css.help}>{t("reminder.note")}</p>
                    </div>
                </>
            ) : null}
            <p className={css.help}>{t("reminder.cost")}</p>
        </section>
    )
}

export default ScheduleReminderFields
